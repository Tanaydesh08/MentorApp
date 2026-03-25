package com.tanaydeshmukh.mentor_platform.service;

import com.tanaydeshmukh.mentor_platform.dto.UserDTO;
import com.tanaydeshmukh.mentor_platform.entity.User;
import com.tanaydeshmukh.mentor_platform.repository.UserRepository;
import com.tanaydeshmukh.mentor_platform.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtUtil jwtUtil;

    @Autowired
    private PasswordEncoder passwordEncoder;

    // ✅ REGISTER (with encryption)
    public UserDTO createUser(User user) {

        user.setPassword(passwordEncoder.encode(user.getPassword())); // 🔐 IMPORTANT

        User savedUser = userRepository.save(user);

        return new UserDTO(savedUser.getEmail(), savedUser.getRole());
    }

    // ✅ GET ALL USERS
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> new UserDTO(user.getEmail(), user.getRole()))
                .collect(Collectors.toList());
    }

    // ✅ LOGIN (FIXED)
    public String login(String email, String password) {

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> new RuntimeException("User not found"));

        // 🔐 compare encrypted password
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }

        return jwtUtil.generateToken(user.getEmail());
    }
}