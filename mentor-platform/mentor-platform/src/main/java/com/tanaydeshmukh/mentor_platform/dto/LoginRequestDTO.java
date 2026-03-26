package com.tanaydeshmukh.mentor_platform.dto;

import lombok.Data;

@Data
public class LoginRequestDTO {
    private String email;
    private String password;
}
