package com.mirelab.application.work

import com.mirelab.domain.work.Work
import com.mirelab.infra.study.StudyMemberRepository
import java.util.UUID
import org.springframework.stereotype.Service

/**
 * "이 사람이 이 작품을 볼 수 있나" 한 군데 판정.
 *
 * 내 서재(개인 관점)와 실시간 공동 편집(블록 접근)이 같은 질문을 하는데, 두 곳이 각자
 * 판정하면 한쪽만 조여지는 일이 생긴다 — 그래서 규칙을 여기 하나로 둔다.
 */
@Service
class WorkAccessChecker(private val studyMemberRepository: StudyMemberRepository) {

    /** 내가 속한 스터디들 — 여러 작품을 연달아 볼 때는 이걸 한 번 받아 재사용한다 */
    fun myStudyIds(userId: UUID): Set<UUID> =
        studyMemberRepository.findByUserId(userId).map { it.study.id!! }.toSet()

    /** 내가 개인으로 담은 작품이거나, 내가 속한 스터디의 작품이면 접근 가능 */
    fun canAccess(work: Work, userId: UUID, myStudyIds: Set<UUID>): Boolean =
        work.owner?.id == userId || work.study?.id?.let { it in myStudyIds } == true

    fun canAccess(work: Work, userId: UUID): Boolean = canAccess(work, userId, myStudyIds(userId))
}
