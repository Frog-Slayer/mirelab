package com.mirelab.application.work

import com.mirelab.domain.work.Work
import com.mirelab.infra.study.StudyMemberRepository
import com.mirelab.infra.study.StudyRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkBlockRepository
import com.mirelab.domain.user.Role
import java.util.UUID
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional

/**
 * "이 사람이 이 작품을 볼 수 있나" 한 군데 판정.
 *
 * 내 서재(개인 관점)와 실시간 공동 편집(블록 접근)이 같은 질문을 하는데, 두 곳이 각자
 * 판정하면 한쪽만 조여지는 일이 생긴다 — 그래서 규칙을 여기 하나로 둔다.
 */
@Service
class WorkAccessChecker(
    private val studyMemberRepository: StudyMemberRepository,
    private val studyRepository: StudyRepository,
    private val userRepository: UserRepository,
    private val workBlockRepository: WorkBlockRepository,
) {

    /** 내가 속한 스터디들 — 여러 작품을 연달아 볼 때는 이걸 한 번 받아 재사용한다 */
    @Transactional(readOnly = true)
    fun myStudyIds(userId: UUID): Set<UUID> {
        val user = userRepository.findById(userId).orElse(null) ?: return emptySet()
        return if (user.role == Role.ADMIN) {
            studyRepository.findAll().mapNotNull { it.id }.toSet()
        } else {
            studyMemberRepository.findByUserId(userId).mapNotNull { it.study.id }.toSet()
        }
    }

    /**
     * 내가 개인으로 담은 작품이거나, 내가 속한 스터디의 작품이면 접근 가능.
     *
     * open-in-view 를 껐으므로 [work] 의 lazy 연관(owner·study)을 여기서 읽으려면 부르는
     * 쪽이 이미 트랜잭션 안이어야 한다 — 이 함수에 @Transactional 을 달아봐야 detached 로
     * 넘어온 엔티티는 되살아나지 않는다.
     */
    fun canAccess(work: Work, userId: UUID, myStudyIds: Set<UUID>): Boolean =
        work.owner?.id == userId || work.study?.id?.let { it in myStudyIds } == true

    /**
     * 블록 하나에 대한 판정 — 없는 블록이면 null.
     *
     * 블록을 밖에서 찾아 넘겨받지 않고 여기서 직접 찾는 이유: `block.work` 는 lazy 라
     * 트랜잭션 밖에서 건드리면 터진다. 엔티티를 경계 밖으로 내보내지 않으려고 조회부터
     * 판정까지 이 트랜잭션 안에서 끝낸다.
     */
    @Transactional(readOnly = true)
    fun canAccessBlock(blockId: UUID, userId: UUID): Boolean? =
        workBlockRepository.findById(blockId).orElse(null)
            ?.let { canAccess(it.work, userId, myStudyIds(userId)) }
}
