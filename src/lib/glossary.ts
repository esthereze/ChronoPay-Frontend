/**
 * ChronoPay Glossary
 *
 * Centralised definitions for domain-specific terms displayed inside
 * HelpPopover components throughout the dashboard. Keep entries concise
 * (title ≤ 6 words, body ≤ 2 sentences) and link to the relevant section of
 * the public docs via `learnMoreHref`.
 *
 * Usage:
 *   import { glossary } from "@/lib/glossary";
 *   <HelpPopover term={glossary.escrow} />
 */

export interface GlossaryTerm {
  /** Short heading shown in bold at the top of the popover (≤ 6 words). */
  title: string;
  /** Plain-language explanation shown in the popover body (≤ 2 sentences). */
  body: string;
  /** Optional URL for the "Learn more" link — relative or absolute. */
  learnMoreHref?: string;
  /** Optional link label override (defaults to "Learn more →"). */
  learnMoreLabel?: string;
}

export const glossary = {
  /**
   * Escrow: tokens locked while a booking is active, released on completion.
   */
  escrow: {
    title: "Escrow",
    body: "Time tokens locked by a smart contract while a booking is active. They are released to the seller when the session completes, or returned to the buyer if it is cancelled.",
    learnMoreHref: "/docs/glossary#escrow",
    learnMoreLabel: "Learn more about escrow →",
  },

  /**
   * Pending escrow: the running total of tokens currently held in escrow.
   */
  pendingEscrow: {
    title: "Pending escrow",
    body: "The total value of time tokens currently held in escrow for your active bookings. This balance is not spendable until the bookings are resolved.",
    learnMoreHref: "/docs/glossary#escrow",
    learnMoreLabel: "Learn more about escrow →",
  },

  /**
   * Mint: creating new time tokens representing available hours.
   */
  mint: {
    title: "Mint a time token",
    body: "Minting creates a new time token on the Stellar network that represents a bookable block of your time. Buyers can then purchase or reserve it.",
    learnMoreHref: "/docs/glossary#mint",
    learnMoreLabel: "Learn more about minting →",
  },

  /**
   * Redemption: buyer converts a token into an actual appointment.
   */
  redemption: {
    title: "Token redemption",
    body: "Redemption is the process where a buyer exchanges their time token for the actual session it represents. Once redeemed, the token is burned and the booking is confirmed.",
    learnMoreHref: "/docs/glossary#redemption",
    learnMoreLabel: "Learn more about redemption →",
  },

  /**
   * Time token: the core unit — an NFT representing a block of time.
   */
  timeToken: {
    title: "Time token",
    body: "A time token is a Stellar-based digital asset that represents a fixed block of your time (e.g. one hour). It can be listed, bought, transferred, and redeemed like a ticket.",
    learnMoreHref: "/docs/glossary#time-token",
    learnMoreLabel: "Learn more about time tokens →",
  },

  /**
   * XLM: Stellar's native currency used for payments and fees.
   */
  xlm: {
    title: "XLM (Lumens)",
    body: "XLM is the native currency of the Stellar network. ChronoPay uses XLM to price time tokens, settle payments, and cover small network transaction fees.",
    learnMoreHref: "/docs/glossary#xlm",
    learnMoreLabel: "Learn more about XLM →",
  },

  /**
   * Payout: scheduled transfer of earned XLM to your wallet.
   */
  nextPayout: {
    title: "Next payout",
    body: "Payouts transfer your earned XLM from completed sessions into your wallet balance. They run on a scheduled cycle; the next date is shown in your wallet card.",
    learnMoreHref: "/docs/glossary#payout",
    learnMoreLabel: "Learn more about payouts →",
  },

  /**
   * Booking stages: lifecycle of a reservation from reserved to completed.
   */
  bookingStages: {
    title: "Booking lifecycle",
    body: "A booking moves through three stages: Reserved (buyer holds a slot), Confirmed (both parties agree), and Completed (session has taken place and payment is released).",
    learnMoreHref: "/docs/glossary#booking-lifecycle",
    learnMoreLabel: "Learn more about booking stages →",
  },

  /**
   * Rate: per-hour price of a time slot in XLM.
   */
  rate: {
    title: "Slot rate",
    body: "The hourly price in XLM for a time slot. This includes the seller's fee and covers Stellar network costs. Rates are set when you mint the token.",
    learnMoreHref: "/docs/glossary#rate",
    learnMoreLabel: "Learn more about pricing →",
  },

  /**
   * Stellar network: the underlying blockchain infrastructure.
   */
  stellarNetwork: {
    title: "Stellar network",
    body: "Stellar is a fast, low-cost blockchain that ChronoPay builds on. Every time token, booking, and payment is recorded as a Stellar transaction.",
    learnMoreHref: "https://stellar.org",
    learnMoreLabel: "Learn about Stellar →",
  },

  /**
   * Base price — the per-session floor price suppliers set for a service.
   * Can be combined with multipliers or discounts, but the base is the
   * canonical rate a buyer sees first.
   */
  basePrice: {
    title: "Base price",
    body: "The base price is the starting per-session rate in XLM a buyer will see when browsing your service. You can apply discounts or multipliers later without changing the base.",
    learnMoreHref: "/docs/onboarding#base-price",
    learnMoreLabel: "Learn more about base pricing →",
  },

  /**
   * Session duration — how long one booking lasts, in minutes.
   * ChronoPay mirrors marketplace norms with 15-minute increments.
   */
  sessionDuration: {
    title: "Session duration",
    body: "The length of a single booked session in minutes. ChronoPay stores durations in 15-minute increments so buyers can stitch sessions cleanly into their calendar.",
    learnMoreHref: "/docs/onboarding#session-duration",
    learnMoreLabel: "Learn more about durations →",
  },
} satisfies Record<string, GlossaryTerm>;
