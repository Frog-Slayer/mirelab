package com.mirelab.domain.study

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.util.UUID

const val READING_STUDY_SLUG = "reading"

@Entity
@Table(name = "studies")
class Study(
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    val id: UUID? = null,

    /** URL 에 쓰는 짧은 이름. RESERVED_SLUGS 와 겹치면 안 된다 */
    @Column(unique = true, nullable = false)
    var slug: String,

    var name: String,

    /** 작품(책·영화)을 다루는 스터디인가. 끄면 라이브러리·명예의 전당이 없다 */
    var hasWorks: Boolean,
)
