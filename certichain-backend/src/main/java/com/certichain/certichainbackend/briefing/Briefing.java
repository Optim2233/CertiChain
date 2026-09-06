package com.certichain.certichainbackend.briefing;

import java.time.Instant;
import java.util.List;

/**
 * "While you were away" briefing. Returning a state (not a boolean) keeps the
 * 24h quiet-suppression decision server-side, next to the timestamp.
 */
public record Briefing(BriefingState state, Instant since, List<BriefingItem> items, int moreCount) {

    public enum BriefingState { UPDATES, ALL_QUIET, NONE }

    /** count is 1 for a discrete event, N for an aggregate ("verified 12 times"). */
    public record BriefingItem(String kind, String title, String detail, int count, Instant at) {}
}
