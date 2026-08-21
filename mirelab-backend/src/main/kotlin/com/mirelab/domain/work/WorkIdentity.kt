package com.mirelab.domain.work

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID
import org.hibernate.annotations.JdbcTypeCode
import org.hibernate.type.SqlTypes

/**
 * "같은 창작물" 정체성 — 판본(BookEdition)이 달라도 같은 작품이면 하나로 묶인다.
 * [WorkMatchKey] 로 계산한 [matchKey] 로 get-or-create 된다.
 */
@Entity
@Table(name = "work_identities")
class WorkIdentity(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false)
    var kind: WorkKind,

    var title: String,

    var author: String,

    @Column(unique = true, nullable = false)
    var matchKey: String,
)
