package com.certichain.certichainbackend.graduate;

import com.certichain.certichainbackend.common.entity.User;

public record GraduateProfileResponse(
        String email, String firstName, String lastName, String phone, String profileImageUrl) {

    public static GraduateProfileResponse from(User u) {
        return new GraduateProfileResponse(
                u.getEmail(), u.getFirstName(), u.getLastName(), u.getPhone(), u.getProfileImageUrl());
    }
}
