package com.mirelab.application.user

import com.mirelab.infra.user.UserRepository
import org.springframework.stereotype.Service

@Service
class UserService(private val userRepository: UserRepository) {
    /** 로그인 붙기 전, 헤더에서 멤버를 고르는 전환용 목록 */
    fun listAll(): List<UserResponse> = userRepository.findAll().map { it.toResponse() }
}
