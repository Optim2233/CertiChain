package com.certichain.certichainbackend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class CertichainBackendApplication {

	public static void main(String[] args) {
		SpringApplication.run(CertichainBackendApplication.class, args);
	}

}
