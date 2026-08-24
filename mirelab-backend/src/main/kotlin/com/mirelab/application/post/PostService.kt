package com.mirelab.application.post

import com.mirelab.application.user.toResponse
import com.mirelab.application.work.WorkAccessChecker
import com.mirelab.application.work.toResponse
import com.mirelab.domain.post.Post
import com.mirelab.domain.post.PostShare
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

    @Transactional
    fun update(postId: UUID, authorId: UUID, input: UpdatePostRequest): PostResponse {
        val post = requireAuthor(postId, authorId)
        val myStudyIds = workAccessChecker.myStudyIds(authorId)
        if (!myStudyIds.containsAll(input.sharedStudyIds)) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "내가 속하지 않은 스터디에는 공유할 수 없습니다")
        }
        val work = input.workId?.let { workId ->
            workRepository.findById(workId).orElseThrow {
                ResponseStatusException(HttpStatus.NOT_FOUND, "없는 작품입니다")
            }.also {
                if (!workAccessChecker.canAccess(it, authorId, myStudyIds)) {
                    throw ResponseStatusException(HttpStatus.BAD_REQUEST, "접근할 수 없는 작품에는 글을 연결할 수 없습니다")
                }
            }
        }
        val title = input.title.trim()
        if (input.published && title.isBlank()) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "공개할 글의 제목을 입력해 주세요")
        }

        post.title = title
        post.bodyJson = input.bodyJson
        post.excerpt = excerptOf(input.bodyJson)
        post.work = work
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
        val visibleWork = post.work?.takeIf { work ->
            viewerId == null || workAccessChecker.canAccess(work, viewerId, viewerStudyIds)
        }
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
