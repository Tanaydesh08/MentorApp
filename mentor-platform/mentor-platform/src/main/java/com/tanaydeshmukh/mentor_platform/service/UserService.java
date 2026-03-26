package com.tanaydeshmukh.mentor_platform.service;

import com.tanaydeshmukh.mentor_platform.dto.LoginRequestDTO;
import com.tanaydeshmukh.mentor_platform.dto.RegisterRequestDTO;
import com.tanaydeshmukh.mentor_platform.dto.UserDTO;
import com.tanaydeshmukh.mentor_platform.dto.UserResponseDTO;
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
    public UserResponseDTO register(RegisterRequestDTO request) {
        User user = new User();
        user.setEmail(request.getEmail());
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setRole(request.getRole());

        User savedUser = userRepository.save(user);
        return new UserResponseDTO(savedUser.getEmail(), savedUser.getRole());
    }

    // ✅ GET ALL USERS
    public List<UserResponseDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> new UserResponseDTO(user.getEmail(), user.getRole()))
                .toList();
    }

    // ✅ LOGIN (FIXED)
    public String login(LoginRequestDTO request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password");
        }
        return jwtUtil.generateToken(user.getEmail());
    }
}