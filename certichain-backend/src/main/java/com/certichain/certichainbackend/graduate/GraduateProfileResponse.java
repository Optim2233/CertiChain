package com.certichain.certichainbackend.graduate;

public record GraduateProfileResponse(
        String email, String firstName, String lastName, String phone, String profileImageUrl) {
}
