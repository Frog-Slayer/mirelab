package com.mirelab.domain.study

import com.mirelab.domain.user.User
import jakarta.persistence.Entity
import jakarta.persistence.FetchType
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.JoinColumn
import jakarta.persistence.ManyToOne
import jakarta.persistence.Table
import jakarta.persistence.UniqueConstraint
import java.util.UUID

/**
 * 사람과 스터디를 잇는 멤버십. 한 사람이 여러 스터디에 속할 수 있으므로
 * [User] 와 분리한다 — "사람과 멤버는 다르다".
 *
 * 작품·칸 값은 이 멤버십이 아니라 [User] 를 직접 참조한다(같은 사람이면 스터디를
 * 넘나들어도 같은 기록으로 이어지게). 이 엔티티는 오직 "누가 이 스터디에 속해 있나"만 안다.
 */
@Entity
@Table(
    name = "study_members",
    uniqueConstraints = [UniqueConstraint(columnNames = ["study_id", "user_id"])],
)
class StudyMember(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "study_id", nullable = false)
    var study: Study,

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    var user: User,
)
