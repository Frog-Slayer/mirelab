package com.mirelab.domain.user

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.EnumType
import jakarta.persistence.Enumerated
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

    /**
     * 구글 계정 이메일 — 이 값이 곧 로그인 키다.
     *
     * null 을 허용하는 이유: 데모 시드로 들어간 사람들(호남·희남·승우)은 기록의 주인이긴
     * 하지만 로그인 계정이 아니다. 비어 있으면 어떤 구글 계정도 이 행으로 들어올 수 없다.
     */
    @Column(unique = true)
    var email: String? = null,

    /**
     * 프로필 사진 파일 이름. 사진 자체는 DB 가 아니라 서버 볼륨에 두고 여기엔 이름만 둔다.
     *
     * 이름이 곧 무작위 UUID 라 갈아끼울 때마다 URL 이 통째로 바뀐다 — 브라우저·프록시가
     * 옛 사진을 계속 들고 있는 일이 없고, 캐시를 영구로 걸어도 안전하다.
     */
    @Column(name = "picture_filename")
    var pictureFilename: String? = null,

    @Enumerated(EnumType.STRING)
    var role: Role = Role.MEMBER,
)
