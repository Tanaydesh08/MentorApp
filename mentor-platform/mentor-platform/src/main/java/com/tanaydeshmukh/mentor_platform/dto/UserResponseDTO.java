package com.tanaydeshmukh.mentor_platform.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class UserResponseDTO {
    private String email;
    private String role;
}
