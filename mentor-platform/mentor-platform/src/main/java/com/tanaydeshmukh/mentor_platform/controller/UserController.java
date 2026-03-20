package com.tanaydeshmukh.mentor_platform.controller;

import com.tanaydeshmukh.mentor_platform.dto.UserDTO;
import com.tanaydeshmukh.mentor_platform.entity.User;
import com.tanaydeshmukh.mentor_platform.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

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
}
