package com.certichain.certichainbackend.institution;

import java.time.LocalDate;

/** One bucket in a trend view: how many events happened on that day. */
public record DailyCount(LocalDate date, long count) {}
