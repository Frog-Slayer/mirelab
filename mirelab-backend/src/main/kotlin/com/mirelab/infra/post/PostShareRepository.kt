package com.mirelab.infra.post

import com.mirelab.domain.post.PostShare
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface PostShareRepository : JpaRepository<PostShare, UUID> {
    fun findByPostId(postId: UUID): List<PostShare>

    fun findByStudyIdAndPostPublishedTrueOrderByPostPublishedAtDesc(studyId: UUID): List<PostShare>

    fun deleteByPostId(postId: UUID)
}
