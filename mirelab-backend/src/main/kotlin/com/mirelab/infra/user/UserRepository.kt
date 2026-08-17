package com.mirelab.infra.user

import com.mirelab.domain.user.User
import java.util.UUID
import org.springframework.data.jpa.repository.JpaRepository

interface UserRepository : JpaRepository<User, UUID>
