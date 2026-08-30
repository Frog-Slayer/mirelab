package com.mirelab.application.post

import com.mirelab.application.user.toResponse
import com.mirelab.application.work.WorkAccessChecker
import com.mirelab.application.work.toResponse
import com.mirelab.domain.post.Post
import com.mirelab.domain.post.PostShare
import com.mirelab.domain.study.READING_STUDY_SLUG
import com.mirelab.infra.post.PostRepository
import com.mirelab.infra.post.PostShareRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.time.Instant
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException
import tools.jackson.databind.ObjectMapper

@Service
class PostService(
    private val postRepository: PostRepository,
    private val postShareRepository: PostShareRepository,
    private val userRepository: UserRepository,
    private val studyRepository: StudyRepository,
    private val workRepository: WorkRepository,
    private val workAccessChecker: WorkAccessChecker,
    private val accessChecker: PostAccessChecker,
    private val objectMapper: ObjectMapper,
) {
    @Transactional(readOnly = true)
    fun listMine(authorId: UUID): List<PostSummaryResponse> =
        postRepository.findByAuthorIdOrderByUpdatedAtDesc(authorId).map { toSummary(it) }

    @Transactional(readOnly = true)
    fun listByUsername(username: String, viewerId: UUID): List<PostSummaryResponse> {
        val author = userRepository.findByUsername(username.lowercase())
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 사용자입니다")
        if (author.id == viewerId) return listMine(viewerId)
        val myStudyIds = workAccessChecker.myStudyIds(viewerId)
        return postRepository.findByAuthorIdOrderByUpdatedAtDesc(requireNotNull(author.id))
            .filter { accessChecker.canAccess(it, viewerId, myStudyIds) }
            .map { toSummary(it, viewerId, myStudyIds) }
    }

    @Transactional(readOnly = true)
    fun listForStudy(slug: String, viewerId: UUID): List<PostSummaryResponse> {
        val study = studyRepository.findBySlug(slug)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 스터디입니다")
        val myStudyIds = workAccessChecker.myStudyIds(viewerId)
        return postShareRepository
            .findByStudyIdAndPostPublishedTrueOrderByPostPublishedAtDesc(requireNotNull(study.id))
            .map { it.post }
            .distinctBy { it.id }
            .filter { accessChecker.canAccess(it, viewerId, myStudyIds) }
            .map { toSummary(it, viewerId, myStudyIds) }
    }

    @Transactional(readOnly = true)
    fun get(postId: UUID, viewerId: UUID): PostResponse {
        val post = find(postId)
        if (!accessChecker.canAccess(post, viewerId, workAccessChecker.myStudyIds(viewerId))) {
            throw ResponseStatusException(HttpStatus.NOT_FOUND, "없는 글입니다")
        }
        return toResponse(post, viewerId, workAccessChecker.myStudyIds(viewerId))
    }

    @Transactional(readOnly = true)
    fun listForWork(workId: UUID, viewerId: UUID): List<PostSummaryResponse> {
        val work = workRepository.findById(workId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 작품입니다")
        }
        val myStudyIds = workAccessChecker.myStudyIds(viewerId)
        if (!workAccessChecker.canAccess(work, viewerId, myStudyIds)) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "접근할 수 없는 작품입니다")
        }
        return postRepository.findByWorkIdOrderByPublishedAtDesc(workId)
            .filter { accessChecker.canAccess(it, viewerId, myStudyIds) }
            .map { toSummary(it, viewerId, myStudyIds) }
    }

    @Transactional
    fun create(authorId: UUID, input: CreatePostRequest): PostResponse {
        val author = userRepository.findById(authorId).orElseThrow()
        return toResponse(postRepository.save(Post(author = author, title = input.title.trim())))
    }

    /** 개인 책의 문서를 글 목록에 노출하기 위한 단 하나의 발행 레코드. */
    @Transactional(readOnly = true)
    fun personalWorkPublication(workId: UUID, authorId: UUID): PostResponse? =
        postRepository.findFirstByWorkIdAndAuthorIdOrderByCreatedAtDesc(workId, authorId)
            ?.let { toResponse(it) }

    /**
     * 개인 책 화면의 발행 설정을 저장한다. 본문과 제목의 원본은 언제나 Work 쪽이다.
     * 따라서 별도 글 편집기에서 두 사본이 갈라지지 않는다.
     */
    @Transactional
    fun updatePersonalWorkPublication(
        authorId: UUID,
        workId: UUID,
        title: String,
        published: Boolean,
    ): PostResponse {
        val work = requirePersonalWork(workId, authorId)
        val readingStudy = studyRepository.findBySlug(READING_STUDY_SLUG)
            ?: throw ResponseStatusException(HttpStatus.NOT_FOUND, "독서 스터디가 없습니다")
        val readingStudyId = requireNotNull(readingStudy.id)
        val myStudyIds = workAccessChecker.myStudyIds(authorId)
        if (readingStudyId !in myStudyIds) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "독서 스터디 멤버만 책 기록을 발행할 수 있습니다")
        }
        val author = userRepository.findById(authorId).orElseThrow()
        val post = postRepository.findFirstByWorkIdAndAuthorIdOrderByCreatedAtDesc(workId, authorId)
            ?: postRepository.save(Post(author = author, work = work))
        val trimmedTitle = title.trim()
        if (published && trimmedTitle.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "공개할 글의 제목을 입력해 주세요")
        }
        post.title = trimmedTitle
        post.bodyJson = work.personalBodyJson
        post.excerpt = excerptOf(work.personalBodyJson)
        post.setPublished(published)
        post.updatedAt = Instant.now()
        val postId = requireNotNull(post.id)
        postShareRepository.deleteByPostId(postId)
        postShareRepository.flush()
        postShareRepository.save(PostShare(post = post, study = readingStudy))
        return toResponse(postRepository.save(post))
    }

    /** 발행 뒤 책장에서 계속 쓴 내용도 공개 글에 즉시 따라가게 한다. */
    @Transactional
    fun syncPersonalWorkDocument(workId: UUID, authorId: UUID, bodyJson: String?) {
        postRepository.findFirstByWorkIdAndAuthorIdOrderByCreatedAtDesc(workId, authorId)?.let { post ->
            post.bodyJson = bodyJson
            post.excerpt = excerptOf(bodyJson)
            post.updatedAt = Instant.now()
        }
    }

    @Transactional
    fun update(postId: UUID, authorId: UUID, input: UpdatePostRequest): PostResponse {
        val post = requireAuthor(postId, authorId)
        if (post.work?.study == null && post.work?.owner?.id == authorId) {
            throw ResponseStatusException(HttpStatus.CONFLICT, "개인 책에 연결된 글은 책장에서 수정해 주세요")
        }
        if (input.workId != post.work?.id) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "글 편집기에서는 연결 작품을 변경할 수 없습니다")
        }
        val myStudyIds = workAccessChecker.myStudyIds(authorId)
        if (!myStudyIds.containsAll(input.sharedStudyIds)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "내가 속하지 않은 스터디에는 공유할 수 없습니다")
        }
        val title = input.title.trim()
        if (input.published && title.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "공개할 글의 제목을 입력해 주세요")
        }

        post.title = title
        post.bodyJson = input.bodyJson
        post.excerpt = excerptOf(input.bodyJson)
        post.setPublished(input.published)
        post.updatedAt = Instant.now()
        postShareRepository.deleteByPostId(postId)
        postShareRepository.flush()
        val studies = studyRepository.findAllById(input.sharedStudyIds)
        postShareRepository.saveAll(studies.map { PostShare(post = post, study = it) })
        return toResponse(postRepository.save(post))
    }

    @Transactional
    fun delete(postId: UUID, authorId: UUID) {
        val post = requireAuthor(postId, authorId)
        postShareRepository.deleteByPostId(postId)
        postRepository.delete(post)
    }

    private fun requireAuthor(postId: UUID, authorId: UUID): Post = find(postId).also {
        if (it.author.id != authorId) {
            throw ResponseStatusException(HttpStatus.FORBIDDEN, "작성자만 글을 바꿀 수 있습니다")
        }
    }

    private fun requirePersonalWork(workId: UUID, authorId: UUID) =
        workRepository.findById(workId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 책입니다")
        }.also { work ->
            if (work.study != null || work.owner?.id != authorId) {
                throw ResponseStatusException(HttpStatus.FORBIDDEN, "내 개인 책만 발행할 수 있습니다")
            }
        }

    private fun find(postId: UUID): Post = postRepository.findById(postId).orElseThrow {
        ResponseStatusException(HttpStatus.NOT_FOUND, "없는 글입니다")
    }

    private fun toSummary(
        post: Post,
        viewerId: UUID? = null,
        viewerStudyIds: Set<UUID> = emptySet(),
    ): PostSummaryResponse {
        val postId = requireNotNull(post.id)
        val shareIds = accessChecker.sharedStudyIds(postId)
        // 글 자체를 볼 권한이 확인된 뒤 만드는 응답이다. 공개 글에 연결된 개인 책의
        // 표지·설명도 글 문맥의 일부이므로, 작품 단독 접근 권한과 무관하게 함께 내린다.
        val visibleWork = post.work
        return PostSummaryResponse(
            postId,
            post.author.toResponse(),
            post.title,
            post.excerpt,
            visibleWork?.toResponse(),
            shareIds,
            post.published,
            post.publishedAt,
            post.createdAt,
            post.updatedAt,
        )
    }

    private fun toResponse(
        post: Post,
        viewerId: UUID? = null,
        viewerStudyIds: Set<UUID> = emptySet(),
    ): PostResponse {
        val summary = toSummary(post, viewerId, viewerStudyIds)
        return PostResponse(
            summary.id,
            summary.author,
            summary.title,
            post.bodyJson,
            summary.excerpt,
            summary.work,
            summary.sharedStudyIds,
            summary.published,
            summary.publishedAt,
            summary.createdAt,
            summary.updatedAt,
        )
    }

    private fun excerptOf(bodyJson: String?): String {
        if (bodyJson.isNullOrBlank()) return ""
        val root = runCatching { objectMapper.readValue(bodyJson, Any::class.java) }.getOrNull() ?: return ""
        val parts = mutableListOf<String>()
        collectText(root, parts)
        return parts.joinToString(" ").replace(Regex("\\s+"), " ").trim().take(200)
    }

    private fun collectText(value: Any?, parts: MutableList<String>) {
        when (value) {
            is Map<*, *> -> value.forEach { (key, child) ->
                if (key == "text" && child is String) parts += child else collectText(child, parts)
            }
            is Iterable<*> -> value.forEach { collectText(it, parts) }
        }
    }
}
