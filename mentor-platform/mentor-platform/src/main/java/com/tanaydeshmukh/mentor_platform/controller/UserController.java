package com.tanaydeshmukh.mentor_platform.controller;

import com.tanaydeshmukh.mentor_platform.dto.LoginRequest;
import com.tanaydeshmukh.mentor_platform.dto.UserDTO;
import com.tanaydeshmukh.mentor_platform.entity.User;
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

    //create user
    @PostMapping
    public UserDTO createUser(@RequestBody User user){
        return userService.createUser(user);
    }

    //Get all users
    @GetMapping
    public List<UserDTO> getAllUsers(){
        return userService.getAllUsers();
    }


//    // 🔐 Login API (ADD THIS)
//    @PostMapping("/login")
//    public String login(@RequestBody LoginRequest request) {
//        return userService.login(request.getEmail(), request.getPassword());
//    }
    @PostMapping("/login")
    public String login(@RequestBody User loginRequest) {

             User user = userRepository.findByEmail(loginRequest.getEmail())
            .orElseThrow(() -> new RuntimeException("User not found"));

             if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
                     throw new RuntimeException("Invalid password");
            }

             return jwtUtil.generateToken(user.getEmail());
    }

    @PostMapping("/register")
    public String register(@RequestBody User user) {
        user.setPassword(passwordEncoder.encode(user.getPassword()));
        userRepository.save(user);
        return "User registered successfully!";
    }
}
