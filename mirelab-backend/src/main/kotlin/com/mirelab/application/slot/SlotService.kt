package com.mirelab.application.slot

import com.mirelab.domain.slot.SlotDef
import com.mirelab.domain.slot.SlotOwner
import com.mirelab.domain.slot.SlotType
import com.mirelab.domain.slot.SlotValue
import com.mirelab.domain.slot.SlotValueContext
import com.mirelab.domain.slot.Visibility
import com.mirelab.infra.slot.SlotDefRepository
import com.mirelab.infra.slot.SlotValueRepository
import com.mirelab.infra.user.UserRepository
import com.mirelab.infra.work.WorkRepository
import java.util.UUID
import org.springframework.http.HttpStatus
import org.springframework.stereotype.Service
import org.springframework.transaction.annotation.Transactional
import org.springframework.web.server.ResponseStatusException

@Service
class SlotService(
    private val slotDefRepository: SlotDefRepository,
    private val slotValueRepository: SlotValueRepository,
    private val workRepository: WorkRepository,
    private val userRepository: UserRepository,
) {
    /**
     * 칸은 그 작품이 속한 스터디 기준. 콜아웃 칸(owner: SESSION)은 그 모임이 이 작품 소관일 때만.
     * 작품 상세는 스터디 공식 기록(STUDY)만 보여준다 — 내 서재 개인 기록은 별도 화면·API 몫이다.
     *
     * 값은 칸의 visibility 로 걸러서 내려준다 — PRIVATE 는 본인 값만, AFTER_DEADLINE 은
     * 그 칸이 걸린 모임(session)이 닫혔을 때만 남 것도 보여준다. 콜아웃이 아닌 칸(session
     * 없음)에 AFTER_DEADLINE 이 붙는 경우는 아직 없어서, 그때는 안전하게 본인 값만 준다.
     *
     * 단 "내 평가" 덩어리([ratingBundleIds])만은 칸의 visibility 대신 값별
     * [SlotValue.published] 로 판정한다 — 평가 공개는 스터디가 일괄로 정하는 게 아니라
     * 각자 자기 것을 열지 말지 고르는 것이라, 개인 토글이 칸 정책보다 우선한다.
     * 다만 숨긴 칸·남의 모임 콜아웃 칸은 published 여부와 무관하게 애초에 이 화면 소관이
     * 아니므로, 그 관문(slotById)은 평가 덩어리도 똑같이 통과해야 한다.
     */
    @Transactional(readOnly = true)
    fun getWorkSlots(workId: UUID, viewerId: UUID): WorkSlotsResponse? {
        val work = workRepository.findById(workId).orElse(null) ?: return null
        val studyId = work.study?.id ?: return null

        val slots = visibleSlotsOf(studyId, workId)
        val slotById = slots.associateBy { it.id }
        val bundleIds = ratingBundleIds(slots)

        val values = slotValueRepository.findByWorkIdAndContext(workId, SlotValueContext.STUDY)
            .filter { value ->
                val slot = slotById[value.slotDef.id]
                when {
                    value.user.id == viewerId -> true
                    slot == null -> false
                    slot.id in bundleIds -> value.published
                    else -> canSee(slot)
                }
            }
        return WorkSlotsResponse(slots.map { it.toResponse() }, values.map { it.toResponse() })
    }

    private fun canSee(slot: SlotDef?): Boolean = when (slot?.visibility) {
        Visibility.ALWAYS -> true
        Visibility.AFTER_DEADLINE -> slot.session?.closed == true
        Visibility.PRIVATE, null -> false
    }

    /**
     * "내 평가" 한 덩어리를 이루는 칸들 — 별점과 그 옆 한줄평.
     *
     * 공개 토글은 이 덩어리를 통째로 여닫는다. 별점만 가리고 한줄평이 남으면 "재미없었다"가
     * 그대로 보이는 채로 점수만 감춘 꼴이라 가린 의미가 없다.
     *
     * 어느 칸이 그 둘이냐는 프론트가 평가 다이얼로그를 채울 때 쓰는 규칙과 같아야 한다
     * (`WorkPage` 의 ratingSlot·blurbSlot) — 한쪽만 바뀌면 화면에서는 한 덩어리인데
     * 서버는 따로 판정하게 된다.
     */
    private fun ratingBundleIds(slots: List<SlotDef>): Set<UUID> = setOfNotNull(
        slots.firstOrNull { it.type == SlotType.RATING }?.id,
        slots.firstOrNull { it.type == SlotType.TEXT_SHORT && it.visibility != Visibility.PRIVATE }?.id,
    )

    private fun visibleSlotsOf(studyId: UUID, workId: UUID): List<SlotDef> =
        slotDefRepository.findByStudyIdOrderBySortOrder(studyId)
            .filter { !it.hidden }
            .filter { it.owner == SlotOwner.STUDY || it.session?.work?.id == workId }

    @Transactional
    fun saveValue(workId: UUID, userId: UUID, input: SlotValueInput): SlotValueResponse {
        val work = workRepository.findById(workId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 작품입니다")
        }
        val slotDef = slotDefRepository.findById(input.slotDefId).orElseThrow {
            ResponseStatusException(HttpStatus.NOT_FOUND, "없는 기록 항목입니다")
        }
        if (work.study?.id == null || slotDef.study.id != work.study?.id) {
            throw ResponseStatusException(HttpStatus.BAD_REQUEST, "작품과 기록 항목의 스터디가 다릅니다")
        }
        val existing = slotValueRepository.findByWorkIdAndSlotDefIdAndUserIdAndContext(
            workId,
            input.slotDefId,
            userId,
            SlotValueContext.STUDY,
        )
        val entity = if (existing != null) {
            existing.value = input.value
            input.draft?.let { existing.draft = it }
            existing
        } else {
            val user = userRepository.findById(userId).orElseThrow()
            SlotValue(work = work, slotDef = slotDef, user = user, value = input.value, draft = input.draft ?: true)
        }
        // 한줄평은 별점과 한 덩어리라 자기 공개 상태를 따로 갖지 않는다 — 별점을 공개해둔
        // 뒤에 쓴 한줄평이 혼자 비공개로 남지 않게, 저장할 때 별점 쪽 상태를 물려받는다.
        val slots = visibleSlotsOf(requireNotNull(work.study?.id), workId)
        if (slotDef.type != SlotType.RATING && slotDef.id in ratingBundleIds(slots)) {
            entity.published = ratingValueOf(slots, workId, userId)?.published == true
        }
        return slotValueRepository.save(entity).toResponse()
    }

    /**
     * 평가 공개 토글. 별점만 열고 한줄평은 비공개로 남기면 반쪽짜리 공개라, 덩어리째 여닫는다
     * ([ratingBundleIds] 참고). 아직 별점을 저장하지 않았으면 열 것도 없으니 실패로 돌려준다.
     */
    @Transactional
    fun setRatingPublished(workId: UUID, userId: UUID, published: Boolean): Boolean {
        val work = workRepository.findById(workId).orElse(null) ?: return false
        val studyId = work.study?.id ?: return false
        val slots = visibleSlotsOf(studyId, workId)
        ratingValueOf(slots, workId, userId) ?: return false

        // 별점 값이 있는 이상 이 목록에는 최소한 그 값이 들어 있다 — 한줄평은 썼으면 따라온다.
        val bundle = ratingBundleIds(slots).mapNotNull { valueOf(workId, it, userId) }
        bundle.forEach { it.published = published }
        slotValueRepository.saveAll(bundle)
        return true
    }

    private fun ratingValueOf(slots: List<SlotDef>, workId: UUID, userId: UUID): SlotValue? =
        slots.firstOrNull { it.type == SlotType.RATING }?.id?.let { valueOf(workId, it, userId) }

    private fun valueOf(workId: UUID, slotDefId: UUID, userId: UUID): SlotValue? =
        slotValueRepository.findByWorkIdAndSlotDefIdAndUserIdAndContext(
            workId,
            slotDefId,
            userId,
            SlotValueContext.STUDY,
        )
}

data class SlotValueInput(
    val slotDefId: UUID,
    val value: Map<String, Any?>,
    val draft: Boolean?,
)
