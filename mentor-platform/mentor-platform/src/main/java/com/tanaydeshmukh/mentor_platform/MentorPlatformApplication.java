package com.tanaydeshmukh.mentor_platform;

import com.tanaydeshmukh.mentor_platform.entity.User;
import com.tanaydeshmukh.mentor_platform.repository.UserRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class MentorPlatformApplication implements CommandLineRunner {

	@Autowired
	private UserRepository userRepository;

	public static void main(String[] args) {
		SpringApplication.run(MentorPlatformApplication.class, args);
	}

	@Override
	public void run(String... args) {
		System.out.println("SERVER STARTED...!");
	}
}