package com.tanaydeshmukh.mentor_platform.service;

import com.tanaydeshmukh.mentor_platform.dto.UserDTO;
import com.tanaydeshmukh.mentor_platform.entity.User;
import com.tanaydeshmukh.mentor_platform.repository.UserRepository;
import com.tanaydeshmukh.mentor_platform.security.JwtUtil;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;
    @Autowired
    private JwtUtil jwtUtil;

    //create users
    public UserDTO createUser(User user) {
        User savedUser = userRepository.save(user);
        return new UserDTO(savedUser.getEmail(), savedUser.getRole());
    }


    //Get all users
    public List<UserDTO> getAllUsers() {
        return userRepository.findAll()
                .stream()
                .map(user -> new UserDTO(user.getEmail(), user.getRole()))
                .collect(Collectors.toList());
    }

    public String login(String email, String password) {

        User user = userRepository.findAll()
                .stream()
                .filter(u -> u.getEmail().equals(email) && u.getPassword().equals(password))
                .findFirst()
                .orElseThrow(() -> new RuntimeException("Invalid credentials"));

        return jwtUtil.generateToken(user.getEmail());
    }
}
