package com.mirelab.user

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

/**
 * 사람. 스터디에 속하기 전에 존재한다 — 로그인 단위.
 * 영서·호남처럼 두 스터디에 다 있는 사람이 있으므로 [com.mirelab.study.StudyMember] 와 분리한다.
 */
@Entity
@Table(name = "users")
class User(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    var name: String,

    /** UI에 쓰는 tailwind 색상 클래스 — 예: "bg-emerald-500" */
    var color: String,
)
