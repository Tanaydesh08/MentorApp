package com.tanaydeshmukh.mentor_platform.service;

import com.tanaydeshmukh.mentor_platform.dto.UserDTO;
import com.tanaydeshmukh.mentor_platform.entity.User;
import com.tanaydeshmukh.mentor_platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

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
}
