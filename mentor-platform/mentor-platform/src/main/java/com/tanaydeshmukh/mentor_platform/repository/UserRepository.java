package com.tanaydeshmukh.mentor_platform.repository;

import com.tanaydeshmukh.mentor_platform.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserRepository extends JpaRepository<User, Long> {
}