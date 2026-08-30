package com.mirelab.application.post

import com.mirelab.domain.post.Post
import com.mirelab.infra.post.PostShareRepository
import java.util.UUID
import org.springframework.stereotype.Service

/** 글의 모든 읽기 경로가 공유하는 단일 공개 판정. */
@Service
class PostAccessChecker(
    private val postShareRepository: PostShareRepository,
) {
    fun canAccess(post: Post, viewerId: UUID, myStudyIds: Set<UUID>): Boolean {
        if (post.author.id == viewerId) return true
        if (!post.published) return false
        return sharedStudyIds(requireNotNull(post.id)).any { it in myStudyIds }
    }

    fun sharedStudyIds(postId: UUID): Set<UUID> =
        postShareRepository.findByPostId(postId).mapNotNull { it.study.id }.toSet()
}
