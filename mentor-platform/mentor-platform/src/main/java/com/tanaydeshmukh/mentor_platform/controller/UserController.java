package com.tanaydeshmukh.mentor_platform.controller;

import com.tanaydeshmukh.mentor_platform.dto.*;
import com.tanaydeshmukh.mentor_platform.repository.UserRepository;
import com.tanaydeshmukh.mentor_platform.security.JwtUtil;
import com.tanaydeshmukh.mentor_platform.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;
    @Autowired
    private UserRepository userRepository;
    @Autowired
    private PasswordEncoder passwordEncoder;
    @Autowired
    private JwtUtil jwtUtil;

    //Get all users
    @GetMapping
    public List<UserResponseDTO> getAllUsers() {
        return userService.getAllUsers();
    }

    @PostMapping("/login")
    public String login(@RequestBody LoginRequestDTO request) {
        return userService.login(request);
    }

    @PostMapping("/register")
    public UserResponseDTO register(@RequestBody RegisterRequestDTO request) {
        return userService.register(request);
    }
}
