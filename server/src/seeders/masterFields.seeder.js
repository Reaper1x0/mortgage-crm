const MasterField = require("../models/masterFields.model");

require("dotenv").config();

const seedData = [
  {
    key: "parcel_identifier_pid",
    label_on_form: "Parcel Identifier: PID",
    type: "string",
    required: true,
    description: "Parcel Identifier (PID) of the mortgaged land.",
    validation_rules: [
      "Format: parcel_identifier_pid must be a non-empty string (trimmed), typically alphanumeric with optional '-' or '/'.",
    ],
  },
  {
    key: "mortgagor_1_name",
    label_on_form: "Mortgagor: Name:",
    type: "string",
    required: true,
    description: "Full name of first mortgagor.",
    validation_rules: [
      "Format: mortgagor_1_name must be a non-empty string (trimmed).",
      "Conflict: mortgagor_1_name must not equal witness_1_name_for_mortgagor_1.",
      "Conflict: mortgagagor_1_name must not equal spouse_of_mortgagor_name.",
    ],
  },
  {
    key: "mortgagor_1_address",
    label_on_form: "Mortgagor: Address:",
    type: "string",
    required: true,
    description: "Full address of first mortgagor.",
    validation_rules: [
      "Format: mortgagor_1_address must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "mortgagor_2_name",
    label_on_form: "Mortgagor: Name: (second mortgagor)",
    type: "string",
    required: false,
    description: "Full name of second mortgagor, if any.",
    validation_rules: [
      "Dependency: if mortgagor_2_name is provided then mortgagor_2_address must be provided.",
      "Conflict: mortgagor_2_name must not equal witness_2_name_for_mortgagor_2.",
      "Conflict: mortgagor_2_name must not equal spouse_of_mortgagor_name.",
    ],
  },
  {
    key: "mortgagor_2_address",
    label_on_form: "Mortgagor: Address: (second mortgagor)",
    type: "string",
    required: false,
    description: "Full address of second mortgagor, if any.",
    validation_rules: [
      "Dependency: if mortgagor_2_address is provided then mortgagor_2_name must be provided.",
    ],
  },
  {
    key: "spouse_mortgagor_reference_name",
    label_on_form: "Spouse of (name of mortgagor):",
    type: "string",
    required: false,
    description: "Name of the mortgagor whose spouse is joining.",
    validation_rules: [
      "Cross-field: if spouse_mortgagor_reference_name is provided, it should match mortgagor_1_name or mortgagor_2_name.",
    ],
  },
  {
    key: "spouse_of_mortgagor_name",
    label_on_form: "Spouse of (name of mortgagor): Name:",
    type: "string",
    required: false,
    description: "Full name of spouse of mortgagor.",
    validation_rules: [
      "Dependency: if clause5_spouse_has_joined_and_consented is true then spouse_of_mortgagor_name must be provided.",
      "Conflict: spouse_of_mortgagor_name must not equal mortgagor_1_name and must not equal mortgagor_2_name.",
      "Conflict: spouse_of_mortgagor_name must not equal witness_spouse_name.",
    ],
  },
  {
    key: "spouse_of_mortgagor_address",
    label_on_form: "Spouse of (name of mortgagor): Address:",
    type: "string",
    required: false,
    description: "Address of spouse of mortgagor.",
    validation_rules: [
      "Dependency: if spouse_of_mortgagor_name is provided then spouse_of_mortgagor_address should be provided.",
    ],
  },
  {
    key: "guarantor_1_name",
    label_on_form: "Guarantor: Name:",
    type: "string",
    required: false,
    description: "Full name of first guarantor.",
    validation_rules: [
      "Conflict: guarantor_1_name must not equal witness_guarantor_1_name.",
      "Dependency: if guarantor_1_name is provided then guarantor_1_address should be provided.",
    ],
  },
  {
    key: "guarantor_1_address",
    label_on_form: "Guarantor: Address:",
    type: "string",
    required: false,
    description: "Address of first guarantor.",
    validation_rules: [
      "Dependency: if guarantor_1_address is provided then guarantor_1_name must be provided.",
    ],
  },
  {
    key: "guarantor_2_name",
    label_on_form: "Guarantor: Name: (second guarantor)",
    type: "string",
    required: false,
    description: "Full name of second guarantor.",
    validation_rules: [
      "Dependency: if guarantor_2_name is provided then guarantor_2_address must be provided.",
      "Conflict: guarantor_2_name must not equal witness_guarantor_2_name.",
    ],
  },
  {
    key: "guarantor_2_address",
    label_on_form: "Guarantor: Address: (second guarantor)",
    type: "string",
    required: false,
    description: "Address of second guarantor.",
    validation_rules: [
      "Dependency: if guarantor_2_address is provided then guarantor_2_name must be provided.",
    ],
  },
  {
    key: "mortgagee_name",
    label_on_form: "Mortgagee: Name:",
    type: "string",
    required: true,
    description: "Name of the mortgagee. Default is 'BANK OF MONTREAL'.",
    validation_rules: [
      "Format: mortgagee_name must be a non-empty string (trimmed).",
      "Cross-field: if lender standard applies then mortgagee_name should equal 'BANK OF MONTREAL'.",
    ],
  },
  {
    key: "mortgagee_address",
    label_on_form: "Mortgagee: Address:",
    type: "string",
    required: true,
    description: "Address of the mortgagee branch.",
    validation_rules: [
      "Format: mortgagee_address must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "manner_of_tenure",
    label_on_form: "Manner of Tenure:",
    type: "string",
    required: false,
    description:
      "Manner of tenure (e.g., freehold, leasehold). May be 'NOT APPLICABLE'.",
    validation_rules: [
      "Format: manner_of_tenure should be one of ['freehold','leasehold','NOT APPLICABLE'] (case-insensitive) when provided.",
    ],
  },
  {
    key: "limitation_of_right_title_interest_mortgaged",
    label_on_form: "Limitation of Right, Title or Interest Mortgaged:",
    type: "string",
    required: false,
    description: "Any limitation on the right, title or interest mortgaged.",
    validation_rules: [],
  },
  {
    key: "principal_sum_amount",
    label_on_form: "Principal Sum: $",
    type: "number",
    required: true,
    description: "Principal sum in Canadian dollars.",
    validation_rules: [
      "Format: principal_sum_amount must be numeric (CAD currency; up to 2 decimals).",
      "Range: principal_sum_amount must be > 0.",
      "Cross-field: if principal_sum_text is provided, principal_sum_text must represent the same value as principal_sum_amount.",
    ],
  },
  {
    key: "principal_sum_text",
    label_on_form: "Principal Sum (text, if any)",
    type: "string",
    required: false,
    description:
      "Principal sum in words, if present elsewhere in the document.",
    validation_rules: [
      "Cross-field: if principal_sum_text is provided, it must match principal_sum_amount (words-to-number consistency).",
    ],
  },
  {
    key: "interest_rate_percent",
    label_on_form: "Interest Rate:",
    type: "number",
    required: true,
    description: "Annual interest rate as a percentage.",
    validation_rules: [
      "Format: interest_rate_percent must be numeric (percent; decimals allowed).",
      "Range: interest_rate_percent must be between 1 and 20.",
      "Cross-field: if schedule_g_fixed_interest_rate_percent is provided then schedule_g_fixed_interest_rate_percent should match interest_rate_percent for fixed-rate mortgages.",
      "Cross-field: if schedule_g_borrower_rate_on_reference_date_percent is provided then schedule_g_borrower_rate_on_reference_date_percent should be consistent with interest_rate_percent for variable-rate mortgages.",
    ],
  },
  {
    key: "interest_rate_text",
    label_on_form: "Interest Rate (text, if any)",
    type: "string",
    required: false,
    description: "Interest rate description in words, if written.",
    validation_rules: [
      "Cross-field: if interest_rate_text is provided, it should be consistent with interest_rate_percent (e.g., mentions the same %).",
    ],
  },
  {
    key: "how_interest_calculated",
    label_on_form: "How Interest Calculated:",
    type: "string",
    required: false,
    description: "Text describing how interest is calculated.",
    validation_rules: [],
  },
  {
    key: "interest_adjustment_date",
    label_on_form: "Interest Adjustment Date:",
    type: "date",
    required: false,
    description: "Interest Adjustment Date.",
    validation_rules: [
      "Format: interest_adjustment_date must be a valid date in YYYY-MM-DD.",
      "Logic: if first_instalment_date is provided then interest_adjustment_date must be on or before first_instalment_date.",
    ],
  },
  {
    key: "term_description",
    label_on_form: "Term:",
    type: "string",
    required: false,
    description: "Description of the mortgage term (e.g., 5 years).",
    validation_rules: [
      "Range/Logic: if term_description can be parsed as years then parsed(term_description) must be between 1 and 35 years.",
      "Logic: if term_description and interest_adjustment_date are parseable and maturity_date is provided then maturity_date should equal interest_adjustment_date + parsed(term_description).",
    ],
  },
  {
    key: "payments_description",
    label_on_form: "Payments:",
    type: "string",
    required: false,
    description:
      "Text describing payment terms, often referring to Schedule 'G'.",
    validation_rules: [],
  },
  {
    key: "payment_dates_description",
    label_on_form: "Payment Dates:",
    type: "string",
    required: false,
    description:
      "Details of payment dates, may state 'NOT APPLICABLE' and refer to Schedule 'G'.",
    validation_rules: [],
  },
  {
    key: "instalment_date_and_period",
    label_on_form: "Instalment date and period:",
    type: "string",
    required: false,
    description:
      "Description of instalment schedule (e.g., monthly, bi-weekly).",
    validation_rules: [
      "Dependency: if instalment_date_and_period is provided then first_instalment_date should be provided.",
    ],
  },
  {
    key: "first_instalment_date",
    label_on_form: "First instalment date:",
    type: "date",
    required: false,
    description: "First instalment payment date.",
    validation_rules: [
      "Format: first_instalment_date must be a valid date in YYYY-MM-DD.",
      "Logic: if last_instalment_date is provided then first_instalment_date must be on or before last_instalment_date.",
      "Logic: if maturity_date is provided then first_instalment_date must be on or before maturity_date.",
    ],
  },
  {
    key: "last_instalment_date",
    label_on_form: "Last instalment date:",
    type: "date",
    required: false,
    description: "Last scheduled instalment date before maturity.",
    validation_rules: [
      "Format: last_instalment_date must be a valid date in YYYY-MM-DD.",
      "Logic: if maturity_date is provided then last_instalment_date must be on or before maturity_date.",
      "Logic: if first_instalment_date is provided then last_instalment_date must be on or after first_instalment_date.",
    ],
  },
  {
    key: "maturity_date",
    label_on_form: "Maturity Date:",
    type: "date",
    required: false,
    description: "Maturity date of the mortgage.",
    validation_rules: [
      "Format: maturity_date must be a valid date in YYYY-MM-DD.",
      "Logic: if first_instalment_date is provided then maturity_date must be on or after first_instalment_date.",
      "Logic: if last_instalment_date is provided then maturity_date must be on or after last_instalment_date.",
      "Cross-field: if schedule_g_mortgage_date is provided and term_description is parseable then maturity_date should be consistent with schedule_g_mortgage_date + parsed(term_description) (or interest_adjustment_date + parsed(term_description) when provided).",
    ],
  },
  {
    key: "place_of_payment",
    label_on_form: "Place of Payment:",
    type: "string",
    required: false,
    description: "Place where mortgage payments are to be made.",
    validation_rules: [],
  },
  {
    key: "statutory_covenants_excluded",
    label_on_form: "Statutory Covenants and Conditions Excluded:",
    type: "string",
    required: false,
    description: "Statutory covenants and conditions excluded. Often 'ALL'.",
    validation_rules: [],
  },
  {
    key: "optional_covenants_included",
    label_on_form: "Optional Covenants and Conditions Included:",
    type: "string",
    required: false,
    description:
      "Optional covenants and conditions included. Often 'BMO-4875'.",
    validation_rules: [],
  },
  {
    key: "mortgage_form_date",
    label_on_form: "Date:",
    type: "date",
    required: false,
    description: "Execution date of Form 15 mortgage.",
    validation_rules: [
      "Format: mortgage_form_date must be a valid date in YYYY-MM-DD.",
      "Cross-field: if schedule_g_mortgage_date is provided then schedule_g_mortgage_date must match mortgage_form_date.",
    ],
  },
  {
    key: "witness_1_name_for_mortgagor_1",
    label_on_form: "Witness: Name: (for first mortgagor)",
    type: "string",
    required: false,
    description: "Name of witness for first mortgagor.",
    validation_rules: [
      "Conflict: witness_1_name_for_mortgagor_1 must not equal mortgagor_1_name and must not equal mortgagor_1_signature_name.",
    ],
  },
  {
    key: "mortgagor_1_signature_name",
    label_on_form: "Mortgagor: Name: (signature block 1)",
    type: "string",
    required: false,
    description: "Name of first mortgagor as it appears near signature.",
    validation_rules: [
      "Cross-field: if mortgagor_1_signature_name is provided then it should match mortgagor_1_name.",
      "Dependency: if mortgagor_1_name is provided then mortgagor_1_signature_name or mortgagor_1_signature should be provided.",
    ],
  },
  {
    key: "mortgagor_1_signature",
    label_on_form: "Mortgagor: Signature: (first mortgagor)",
    type: "string",
    required: false,
    description: "Signature representation or name for first mortgagor.",
    validation_rules: [
      "Dependency: if mortgagor_1_name is provided then mortgagor_1_signature or mortgagor_1_signature_name should be provided.",
    ],
  },
  {
    key: "witness_2_name_for_mortgagor_2",
    label_on_form: "Witness: Name: (for second mortgagor)",
    type: "string",
    required: false,
    description: "Name of witness for second mortgagor.",
    validation_rules: [
      "Conflict: witness_2_name_for_mortgagor_2 must not equal mortgagor_2_name and must not equal mortgagor_2_signature_name.",
      "Dependency: if mortgagor_2_name is provided then witness_2_name_for_mortgagor_2 should be provided.",
    ],
  },
  {
    key: "mortgagor_2_signature_name",
    label_on_form: "Mortgagor: Name: (signature block 2)",
    type: "string",
    required: false,
    description: "Name of second mortgagor as it appears near signature.",
    validation_rules: [
      "Cross-field: if mortgagor_2_signature_name is provided then it should match mortgagor_2_name.",
      "Dependency: if mortgagor_2_name is provided then mortgagor_2_signature_name or mortgagor_2_signature should be provided.",
    ],
  },
  {
    key: "mortgagor_2_signature",
    label_on_form: "Mortgagor: Signature: (second mortgagor)",
    type: "string",
    required: false,
    description: "Signature representation or name for second mortgagor.",
    validation_rules: [
      "Dependency: if mortgagor_2_name is provided then mortgagor_2_signature or mortgagor_2_signature_name should be provided.",
    ],
  },
  {
    key: "witness_spouse_name",
    label_on_form: "Witness: Name: (for spouse of mortgagor)",
    type: "string",
    required: false,
    description: "Name of witness for spouse of mortgagor.",
    validation_rules: [
      "Conflict: witness_spouse_name must not equal spouse_of_mortgagor_name.",
      "Conflict: witness_spouse_name must not equal mortgagor_1_name and must not equal mortgagor_2_name.",
      "Dependency: if spouse_of_mortgagor_name is provided then witness_spouse_name should be provided.",
    ],
  },
  {
    key: "spouse_of_mortgagor_reference_in_sign_block",
    label_on_form: "Spouse of (name of mortgagor): (in signature block)",
    type: "string",
    required: false,
    description: "Name of mortgagor referenced in spouse signature block.",
    validation_rules: [
      "Cross-field: if spouse_of_mortgagor_reference_in_sign_block is provided, it should match mortgagor_1_name or mortgagor_2_name.",
    ],
  },
  {
    key: "spouse_signature_name",
    label_on_form: "Name of spouse:",
    type: "string",
    required: false,
    description: "Name of spouse as written in signature area.",
    validation_rules: [
      "Cross-field: if spouse_signature_name is provided then it should match spouse_of_mortgagor_name.",
      "Dependency: if clause5_spouse_has_joined_and_consented is true then spouse_signature_name or spouse_signature should be provided.",
    ],
  },
  {
    key: "spouse_signature",
    label_on_form: "Spouse: Signature:",
    type: "string",
    required: false,
    description: "Signature representation or name of spouse.",
    validation_rules: [
      "Dependency: if clause5_spouse_has_joined_and_consented is true then spouse_signature or spouse_signature_name should be provided.",
    ],
  },
  {
    key: "witness_guarantor_1_name",
    label_on_form: "Witness: Name: (for first guarantor)",
    type: "string",
    required: false,
    description: "Name of witness for first guarantor.",
    validation_rules: [
      "Conflict: witness_guarantor_1_name must not equal guarantor_1_name and must not equal guarantor_1_signature_name.",
      "Dependency: if guarantor_1_name is provided then witness_guarantor_1_name should be provided.",
    ],
  },
  {
    key: "guarantor_1_signature_name",
    label_on_form: "Guarantor: Name: (signature block 1)",
    type: "string",
    required: false,
    description: "Name of first guarantor as it appears in signature area.",
    validation_rules: [
      "Cross-field: if guarantor_1_signature_name is provided then it should match guarantor_1_name.",
      "Dependency: if guarantor_1_name is provided then guarantor_1_signature_name or guarantor_1_signature should be provided.",
    ],
  },
  {
    key: "guarantor_1_signature",
    label_on_form: "Guarantor: Signature: (first guarantor)",
    type: "string",
    required: false,
    description: "Signature representation or name of first guarantor.",
    validation_rules: [
      "Dependency: if guarantor_1_name is provided then guarantor_1_signature or guarantor_1_signature_name should be provided.",
    ],
  },
  {
    key: "witness_guarantor_2_name",
    label_on_form: "Witness: Name: (for second guarantor)",
    type: "string",
    required: false,
    description: "Name of witness for second guarantor.",
    validation_rules: [
      "Conflict: witness_guarantor_2_name must not equal guarantor_2_name and must not equal guarantor_2_signature_name.",
      "Dependency: if guarantor_2_name is provided then witness_guarantor_2_name should be provided.",
    ],
  },
  {
    key: "guarantor_2_signature_name",
    label_on_form: "Guarantor: Name: (signature block 2)",
    type: "string",
    required: false,
    description: "Name of second guarantor as it appears in signature area.",
    validation_rules: [
      "Cross-field: if guarantor_2_signature_name is provided then it should match guarantor_2_name.",
      "Dependency: if guarantor_2_name is provided then guarantor_2_signature_name or guarantor_2_signature should be provided.",
    ],
  },
  {
    key: "guarantor_2_signature",
    label_on_form: "Guarantor: Signature: (second guarantor)",
    type: "string",
    required: false,
    description: "Signature representation or name of second guarantor.",
    validation_rules: [
      "Dependency: if guarantor_2_name is provided then guarantor_2_signature or guarantor_2_signature_name should be provided.",
    ],
  },

  {
    key: "schedule_g_mortgagor_names",
    label_on_form: 'Schedule "G" - To a mortgage between:',
    type: "string",
    required: true,
    description:
      "Name(s) of mortgagor(s) in the introductory line of Schedule G.",
    validation_rules: [
      "Cross-field: schedule_g_mortgagor_names must include mortgagor_1_name (and mortgagor_2_name if mortgagor_2_name is provided).",
    ],
  },
  {
    key: "schedule_g_mortgage_date",
    label_on_form: "and dated .",
    type: "date",
    required: true,
    description: "Date of the mortgage as referenced in Schedule G.",
    validation_rules: [
      "Format: schedule_g_mortgage_date must be a valid date in YYYY-MM-DD.",
      "Cross-field: schedule_g_mortgage_date must match mortgage_form_date when mortgage_form_date is provided.",
    ],
  },
  {
    key: "schedule_g_mortgage_product_term",
    label_on_form: "1.1 Mortgage Product. You have a ____ term.",
    type: "string",
    required: false,
    description:
      "Description of mortgage product term (e.g., 5-year fixed, variable).",
    validation_rules: [
      "Dependency: if schedule_g_mortgage_product_term indicates 'variable' then schedule_g_prime_rate_percent and schedule_g_prime_rate_reference_date must be provided.",
      "Dependency: if schedule_g_mortgage_product_term indicates 'fixed' then schedule_g_fixed_interest_rate_percent should be provided.",
    ],
  },
  {
    key: "schedule_g_fixed_interest_rate_percent",
    label_on_form:
      "Interest rate. For a fixed rate term, ___% per year, calculated half-yearly not in advance.",
    type: "number",
    required: false,
    description: "Interest rate for a fixed rate term as a percentage.",
    validation_rules: [
      "Format: schedule_g_fixed_interest_rate_percent must be numeric (percent; decimals allowed).",
      "Range: schedule_g_fixed_interest_rate_percent must be between 1 and 20.",
      "Cross-field: if schedule_g_fixed_interest_rate_percent is provided then it should match interest_rate_percent.",
      "Dependency: if schedule_g_mortgage_product_term indicates 'fixed' then schedule_g_fixed_interest_rate_percent should be provided.",
    ],
  },
  {
    key: "schedule_g_prime_rate_reference_date",
    label_on_form: "On ____ , our prime rate was ____%.",
    type: "date",
    required: false,
    description: "Date at which the bank's prime rate is referenced.",
    validation_rules: [
      "Format: schedule_g_prime_rate_reference_date must be a valid date in YYYY-MM-DD.",
      "Dependency: if schedule_g_prime_rate_percent is provided then schedule_g_prime_rate_reference_date must be provided.",
      "Dependency: if schedule_g_mortgage_product_term indicates 'variable' then schedule_g_prime_rate_reference_date must be provided.",
    ],
  },
  {
    key: "schedule_g_prime_rate_percent",
    label_on_form: "On [date], our prime rate was ___% per year.",
    type: "number",
    required: false,
    description: "Bank prime rate as a percentage on the reference date.",
    validation_rules: [
      "Format: schedule_g_prime_rate_percent must be numeric (percent; decimals allowed).",
      "Range: schedule_g_prime_rate_percent must be between 0 and 30.",
      "Dependency: if schedule_g_mortgage_product_term indicates 'variable' then schedule_g_prime_rate_percent must be provided.",
    ],
  },
  {
    key: "schedule_g_borrower_rate_on_reference_date_percent",
    label_on_form:
      "On that date, your interest rate was ___% per year, calculated monthly not in advance.",
    type: "number",
    required: false,
    description:
      "Borrower's interest rate as a percentage on the same reference date.",
    validation_rules: [
      "Format: schedule_g_borrower_rate_on_reference_date_percent must be numeric (percent; decimals allowed).",
      "Range: schedule_g_borrower_rate_on_reference_date_percent must be between 1 and 30.",
      "Dependency: if schedule_g_mortgage_product_term indicates 'variable' then schedule_g_borrower_rate_on_reference_date_percent should be provided.",
      "Cross-field: if schedule_g_borrower_rate_on_reference_date_percent is provided then it should be consistent with interest_rate_percent.",
    ],
  },
  {
    key: "schedule_g_equivalent_annual_rate_in_advance_percent",
    label_on_form: "This is equivalent to ___% per year in advance.",
    type: "number",
    required: false,
    description: "Equivalent annual rate expressed in advance.",
    validation_rules: [
      "Format: schedule_g_equivalent_annual_rate_in_advance_percent must be numeric (percent; decimals allowed).",
      "Range: schedule_g_equivalent_annual_rate_in_advance_percent must be between 1 and 30.",
      "Cross-field: if schedule_g_borrower_rate_on_reference_date_percent is provided then schedule_g_equivalent_annual_rate_in_advance_percent should be consistent with schedule_g_borrower_rate_on_reference_date_percent.",
    ],
  },
  {
    key: "schedule_g_variable_rate_terms_text",
    label_on_form:
      "1.3 Variable rate terms / 1.3.1 General Terms / 1.3.3 Other.",
    type: "string",
    required: false,
    description:
      "Any additional text or specifics regarding variable rate terms and other terms in Schedule G.",
    validation_rules: [
      "Dependency: if schedule_g_variable_rate_terms_text is provided then schedule_g_prime_rate_percent and schedule_g_prime_rate_reference_date should be provided (variable-rate completeness).",
    ],
  },
  {
    key: "schedule_g_special_terms_text",
    label_on_form: "2. Special Terms.",
    type: "string",
    required: false,
    description:
      "Text of any special terms specified in section 2 of Schedule G.",
    validation_rules: [],
  },

  {
    key: "deponent_1_name",
    label_on_form: "Deponent: (Name) [first]",
    type: "string",
    required: true,
    description: "Name of first deponent.",
    validation_rules: [
      "Format: deponent_1_name must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "deponent_1_address",
    label_on_form: "Deponent: (Address) [first]",
    type: "string",
    required: true,
    description: "Address of first deponent.",
    validation_rules: [
      "Format: deponent_1_address must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "deponent_2_name",
    label_on_form: "Deponent: (Name) [second]",
    type: "string",
    required: false,
    description: "Name of second deponent, if any.",
    validation_rules: [
      "Dependency: if deponent_2_name is provided then deponent_2_address should be provided.",
    ],
  },
  {
    key: "deponent_2_address",
    label_on_form: "Deponent: (Address) [second]",
    type: "string",
    required: false,
    description: "Address of second deponent, if any.",
    validation_rules: [
      "Dependency: if deponent_2_address is provided then deponent_2_name must be provided.",
    ],
  },
  {
    key: "spouse_of_deponent_name",
    label_on_form: "Spouse of Deponent: (Name)",
    type: "string",
    required: false,
    description: "Name of spouse of the deponent(s).",
    validation_rules: [
      "Dependency: if clause2_spouse_name_as_specified_selected is true then spouse_of_deponent_name must be provided.",
      "Logic: if clause2_not_married_selected is true then spouse_of_deponent_name should be empty.",
    ],
  },
  {
    key: "spouse_of_deponent_address",
    label_on_form: "Spouse of Deponent: (Address)",
    type: "string",
    required: false,
    description: "Address of spouse of deponent(s).",
    validation_rules: [
      "Dependency: if spouse_of_deponent_name is provided then spouse_of_deponent_address should be provided.",
    ],
  },
  {
    key: "domestic_contract_date",
    label_on_form: "Date of Domestic Contract:",
    type: "date",
    required: false,
    description: "Date of any domestic contract referenced.",
    validation_rules: [
      "Format: domestic_contract_date must be a valid date in YYYY-MM-DD.",
      "Dependency: if clause5_reason_domestic_contract_selected is true then domestic_contract_date must be provided.",
    ],
  },
  {
    key: "court_order_date",
    label_on_form: "Date of Court Order:",
    type: "date",
    required: false,
    description: "Date of any court order referenced.",
    validation_rules: [
      "Format: court_order_date must be a valid date in YYYY-MM-DD.",
      "Dependency: if clause5_reason_court_order_release_selected is true then court_order_date must be provided.",
      "Dependency: if clause5_reason_court_authorization_selected is true then court_order_date must be provided.",
    ],
  },
  {
    key: "clause2_not_married_selected",
    label_on_form: "Clause 2 - That I am/we are not married.",
    type: "boolean",
    required: false,
    description:
      "Indicates that the checkbox/mark for 'not married' is selected.",
    validation_rules: [
      "Logic: clause2_not_married_selected and clause2_spouse_name_as_specified_selected should not both be true.",
      "Logic: if clause2_not_married_selected is true then spouse_of_deponent_name should be empty and clause5_spouse_has_joined_and_consented should be false.",
    ],
  },
  {
    key: "clause2_spouse_name_as_specified_selected",
    label_on_form:
      "Clause 2 - That the name of my spouse is as specified above.",
    type: "boolean",
    required: false,
    description:
      "Indicates that the checkbox/mark for 'spouse name as specified above' is selected.",
    validation_rules: [
      "Logic: clause2_spouse_name_as_specified_selected and clause2_not_married_selected should not both be true.",
      "Dependency: if clause2_spouse_name_as_specified_selected is true then spouse_of_deponent_name must be provided.",
    ],
  },
  {
    key: "clause3_no_former_spouse_with_right_selected",
    label_on_form:
      "Clause 3 - That I/we have no former spouse with a right under the Marital Property Act...",
    type: "boolean",
    required: false,
    description:
      "Indicates that the deponent(s) affirm there is no former spouse with rights in the subject land.",
    validation_rules: [],
  },
  {
    key: "subject_land_occupied_as_marital_home",
    label_on_form:
      "Clause 4 - That the subject land has (not) been occupied by me and my spouse as our marital home.",
    type: "string",
    required: false,
    description:
      "Whether the land has or has not been occupied as a marital home (e.g., 'has', 'has not').",
    validation_rules: [
      "Format: subject_land_occupied_as_marital_home should be one of ['has','has not'] (case-insensitive) when provided.",
    ],
  },
  {
    key: "clause5_spouse_has_joined_and_consented",
    label_on_form:
      "Clause 5 - That my spouse has joined in this instrument and has consented...",
    type: "boolean",
    required: false,
    description: "Indicates that spouse has joined and consented.",
    validation_rules: [
      "Dependency: if clause5_spouse_has_joined_and_consented is true then spouse_of_mortgagor_name and spouse_signature (or spouse_signature_name) must be provided.",
      "Logic: if clause5_spouse_has_joined_and_consented is true then clause5_spouse_signature_not_required should be false.",
    ],
  },
  {
    key: "clause5_spouse_signature_not_required",
    label_on_form:
      "Clause 5 - The signature of my spouse is not required because:",
    type: "boolean",
    required: false,
    description:
      "Indicates that the spouse's signature is declared not required.",
    validation_rules: [
      "Logic: if clause5_spouse_signature_not_required is true then clause5_spouse_has_joined_and_consented should be false.",
      "Dependency: if clause5_spouse_signature_not_required is true then at least one of clause5_reason_domestic_contract_selected, clause5_reason_court_order_release_selected, clause5_reason_court_authorization_selected must be true.",
    ],
  },
  {
    key: "clause5_reason_domestic_contract_selected",
    label_on_form:
      "Clause 5 - my spouse has released all rights to the marital home by reason of a domestic contract dated as specified above.",
    type: "boolean",
    required: false,
    description: "Indicates the domestic contract reason is selected.",
    validation_rules: [
      "Dependency: if clause5_reason_domestic_contract_selected is true then domestic_contract_date must be provided.",
    ],
  },
  {
    key: "clause5_reason_court_order_release_selected",
    label_on_form:
      "Clause 5 - the marital home has been released by order of The Court of Queen’s Bench of New Brunswick dated as specified above.",
    type: "boolean",
    required: false,
    description: "Indicates the court order release reason is selected.",
    validation_rules: [
      "Dependency: if clause5_reason_court_order_release_selected is true then court_order_date must be provided.",
    ],
  },
  {
    key: "clause5_reason_court_authorization_selected",
    label_on_form:
      "Clause 5 - this disposition has been authorized by The Court of Queen’s Bench of New Brunswick by order dated as specified above.",
    type: "boolean",
    required: false,
    description: "Indicates the court authorization reason is selected.",
    validation_rules: [
      "Dependency: if clause5_reason_court_authorization_selected is true then court_order_date must be provided.",
    ],
  },
  {
    key: "marital_affidavit_sworn_place",
    label_on_form: "(Severally) Sworn before me, at the",
    type: "string",
    required: false,
    description: "Place where the affidavit of marital status is sworn.",
    validation_rules: [],
  },
  {
    key: "marital_affidavit_sworn_jurisdiction",
    label_on_form: "in the",
    type: "string",
    required: false,
    description: "Jurisdiction/region where the affidavit is sworn.",
    validation_rules: [],
  },
  {
    key: "marital_affidavit_sworn_day",
    label_on_form: "day of",
    type: "number",
    required: false,
    description: "Day of the month when the affidavit is sworn.",
    validation_rules: [
      "Range/Logic: marital_affidavit_sworn_day must be between 1 and 31 when provided.",
      "Dependency: if marital_affidavit_sworn_day is provided then marital_affidavit_sworn_month and marital_affidavit_sworn_year must be provided.",
    ],
  },
  {
    key: "marital_affidavit_sworn_month",
    label_on_form: "this [month]",
    type: "string",
    required: false,
    description: "Month when the affidavit is sworn.",
    validation_rules: [
      "Dependency: if marital_affidavit_sworn_month is provided then marital_affidavit_sworn_day and marital_affidavit_sworn_year must be provided.",
    ],
  },
  {
    key: "marital_affidavit_sworn_year",
    label_on_form: "20__",
    type: "number",
    required: false,
    description: "Year when the affidavit is sworn.",
    validation_rules: [
      "Range/Logic: marital_affidavit_sworn_year must be between 1900 and 2100 when provided.",
      "Dependency: if marital_affidavit_sworn_year is provided then marital_affidavit_sworn_day and marital_affidavit_sworn_month must be provided.",
    ],
  },
  {
    key: "marital_deponent_signature_name",
    label_on_form: "Name: (beside deponent signature)",
    type: "string",
    required: false,
    description: "Name of deponent as signed near the jurat.",
    validation_rules: [
      "Cross-field: if marital_deponent_signature_name is provided then it should match deponent_1_name (or deponent_2_name when applicable).",
    ],
  },
  {
    key: "marital_commissioner_name",
    label_on_form: "A Commissioner Being a Solicitor Name:",
    type: "string",
    required: false,
    description:
      "Name of Commissioner of Oaths / Solicitor for the marital status affidavit.",
    validation_rules: [],
  },
  {
    key: "marital_notary_jurisdiction_outside_province",
    label_on_form: "A Notary Public in and for",
    type: "string",
    required: false,
    description:
      "Jurisdiction of the notary public if affidavit is signed outside the province.",
    validation_rules: [],
  },
  {
    key: "marital_notary_commission_expiry_date",
    label_on_form: "My Commission expires on __ , 20__.",
    type: "date",
    required: false,
    description:
      "Commission expiry date of the notary public for outside-province execution.",
    validation_rules: [
      "Format: marital_notary_commission_expiry_date must be a valid date in YYYY-MM-DD.",
      "Logic: if marital_notary_commission_expiry_date and mortgage_form_date are provided then marital_notary_commission_expiry_date should be after mortgage_form_date.",
    ],
  },

  {
    key: "subscribing_witness_name",
    label_on_form: "Subscribing Witness: (Name)",
    type: "string",
    required: true,
    description: "Name of the subscribing witness.",
    validation_rules: [
      "Conflict: subscribing_witness_name must not equal person_executed_1_name and must not equal person_executed_2_name.",
      "Cross-field: if execution_deponent_signature_name is provided then execution_deponent_signature_name should match subscribing_witness_name.",
    ],
  },
  {
    key: "subscribing_witness_address",
    label_on_form: "Subscribing Witness: (Address)",
    type: "string",
    required: true,
    description: "Address of the subscribing witness.",
    validation_rules: [
      "Format: subscribing_witness_address must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "person_executed_1_name",
    label_on_form: "Person(s) Who Executed the Instrument: (Name) [first]",
    type: "string",
    required: true,
    description: "Name of first person who executed the instrument.",
    validation_rules: [
      "Format: person_executed_1_name must be a non-empty string (trimmed).",
      "Cross-field: certificate_person_executed_1_name must match person_executed_1_name when certificate_person_executed_1_name is provided.",
    ],
  },
  {
    key: "person_executed_2_name",
    label_on_form: "Person(s) Who Executed the Instrument: (Name) [second]",
    type: "string",
    required: false,
    description: "Name of second person who executed the instrument, if any.",
    validation_rules: [
      "Dependency: if person_executed_2_name is provided then certificate_person_executed_2_name should be provided and must match person_executed_2_name.",
      "Conflict: if person_executed_2_name is provided then person_executed_2_name must not equal subscribing_witness_name.",
    ],
  },
  {
    key: "affidavit_execution_place_of_execution",
    label_on_form: "Place of Execution:",
    type: "string",
    required: true,
    description: "Place where the instrument was executed.",
    validation_rules: [
      "Format: affidavit_execution_place_of_execution must be a non-empty string (trimmed).",
      "Cross-field: if certificate_place_of_execution is provided then certificate_place_of_execution should match affidavit_execution_place_of_execution.",
    ],
  },
  {
    key: "affidavit_execution_date_of_execution",
    label_on_form: "Date of Execution:",
    type: "date",
    required: true,
    description: "Date when the instrument was executed.",
    validation_rules: [
      "Format: affidavit_execution_date_of_execution must be a valid date in YYYY-MM-DD.",
      "Cross-field: if certificate_date_of_execution is provided then certificate_date_of_execution should match affidavit_execution_date_of_execution.",
    ],
  },
  {
    key: "execution_affidavit_sworn_place",
    label_on_form: "Sworn before me, at the",
    type: "string",
    required: false,
    description: "Place where the affidavit of execution is sworn.",
    validation_rules: [],
  },
  {
    key: "execution_affidavit_sworn_jurisdiction",
    label_on_form: "in the",
    type: "string",
    required: false,
    description:
      "Jurisdiction/region where the affidavit of execution is sworn.",
    validation_rules: [],
  },
  {
    key: "execution_affidavit_sworn_day",
    label_on_form: "day of",
    type: "number",
    required: false,
    description: "Day of the month when the affidavit is sworn.",
    validation_rules: [
      "Range/Logic: execution_affidavit_sworn_day must be between 1 and 31 when provided.",
      "Dependency: if execution_affidavit_sworn_day is provided then execution_affidavit_sworn_month and execution_affidavit_sworn_year must be provided.",
    ],
  },
  {
    key: "execution_affidavit_sworn_month",
    label_on_form: "this [month]",
    type: "string",
    required: false,
    description: "Month when the affidavit is sworn.",
    validation_rules: [
      "Dependency: if execution_affidavit_sworn_month is provided then execution_affidavit_sworn_day and execution_affidavit_sworn_year must be provided.",
    ],
  },
  {
    key: "execution_affidavit_sworn_year",
    label_on_form: "20__",
    type: "number",
    required: false,
    description: "Year when the affidavit is sworn.",
    validation_rules: [
      "Range/Logic: execution_affidavit_sworn_year must be between 1900 and 2100 when provided.",
      "Dependency: if execution_affidavit_sworn_year is provided then execution_affidavit_sworn_day and execution_affidavit_sworn_month must be provided.",
    ],
  },
  {
    key: "execution_deponent_signature_name",
    label_on_form: "Name: (subscribing witness near jurat)",
    type: "string",
    required: false,
    description: "Name of subscribing witness as signed near jurat.",
    validation_rules: [
      "Cross-field: if execution_deponent_signature_name is provided then it should match subscribing_witness_name.",
    ],
  },
  {
    key: "execution_commissioner_name",
    label_on_form: "A Commissioner Being a Solicitor Name:",
    type: "string",
    required: false,
    description:
      "Name of Commissioner of Oaths / Solicitor for the affidavit of execution.",
    validation_rules: [],
  },
  {
    key: "execution_notary_jurisdiction_outside_province",
    label_on_form: "A Notary Public in and for",
    type: "string",
    required: false,
    description:
      "Jurisdiction of the notary public if this affidavit is signed outside the province.",
    validation_rules: [],
  },
  {
    key: "execution_notary_commission_expiry_date",
    label_on_form: "My Commission expires on __ , 20__.",
    type: "date",
    required: false,
    description:
      "Commission expiry date of the notary public for outside-province execution.",
    validation_rules: [
      "Format: execution_notary_commission_expiry_date must be a valid date in YYYY-MM-DD.",
      "Logic: if execution_notary_commission_expiry_date and affidavit_execution_date_of_execution are provided then execution_notary_commission_expiry_date should be after affidavit_execution_date_of_execution.",
    ],
  },

  {
    key: "notary_public_name",
    label_on_form: "Notary Public: (Name)",
    type: "string",
    required: true,
    description: "Name of the Notary Public.",
    validation_rules: [
      "Format: notary_public_name must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "notary_public_address",
    label_on_form: "Notary Public: (Address)",
    type: "string",
    required: true,
    description: "Address of the Notary Public.",
    validation_rules: [
      "Format: notary_public_address must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "notary_public_jurisdiction",
    label_on_form: "Jurisdiction:",
    type: "string",
    required: true,
    description: "Jurisdiction in which the Notary Public is authorized.",
    validation_rules: [
      "Format: notary_public_jurisdiction must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "notary_place_of_residence",
    label_on_form: "Place of Residence of Notary Public:",
    type: "string",
    required: true,
    description: "Place of residence of the Notary Public.",
    validation_rules: [
      "Format: notary_place_of_residence must be a non-empty string (trimmed).",
    ],
  },
  {
    key: "certificate_person_executed_1_name",
    label_on_form: "Person(s) Who Executed the Instrument: (Name) [first]",
    type: "string",
    required: true,
    description: "Name of first person who executed the instrument.",
    validation_rules: [
      "Cross-field: certificate_person_executed_1_name must match person_executed_1_name.",
    ],
  },
  {
    key: "certificate_person_executed_2_name",
    label_on_form: "Person(s) Who Executed the Instrument: (Name) [second]",
    type: "string",
    required: false,
    description: "Name of second person who executed the instrument, if any.",
    validation_rules: [
      "Cross-field: if certificate_person_executed_2_name is provided then it must match person_executed_2_name.",
      "Dependency: if person_executed_2_name is provided then certificate_person_executed_2_name must be provided and match person_executed_2_name.",
    ],
  },
  {
    key: "certificate_place_of_execution",
    label_on_form: "Place of Execution:",
    type: "string",
    required: true,
    description: "Place where the instrument was executed.",
    validation_rules: [
      "Cross-field: certificate_place_of_execution must match affidavit_execution_place_of_execution.",
    ],
  },
  {
    key: "certificate_date_of_execution",
    label_on_form: "Date of Execution:",
    type: "date",
    required: true,
    description: "Date when the instrument was executed.",
    validation_rules: [
      "Format: certificate_date_of_execution must be a valid date in YYYY-MM-DD.",
      "Cross-field: certificate_date_of_execution must match affidavit_execution_date_of_execution.",
    ],
  },
  {
    key: "certificate_place_final",
    label_on_form: "Place:",
    type: "string",
    required: false,
    description: "Place indicated at the end of the Certificate of Execution.",
    validation_rules: [],
  },
  {
    key: "certificate_date_final",
    label_on_form: "Date:",
    type: "date",
    required: false,
    description: "Date indicated at the end of the Certificate of Execution.",
    validation_rules: [
      "Format: certificate_date_final must be a valid date in YYYY-MM-DD when provided.",
    ],
  },
  {
    key: "certificate_notary_signature_name",
    label_on_form: "Notary Public:",
    type: "string",
    required: false,
    description:
      "Name of Notary Public as signed under the final signature line.",
    validation_rules: [
      "Cross-field: if certificate_notary_signature_name is provided then it should match notary_public_name.",
    ],
  },
];

// OPTIONAL: Faster bulk version (same behavior, keeps _id for existing docs)
const seedMasterFieldsBulk = async () => {
  try {
    const ops = seedData.map((field) => ({
      updateOne: {
        filter: { key: field.key },
        update: {
          $set: {
            key: field.key,
            label_on_form: field.label_on_form,
            type: field.type,
            required: field.required,
            description: field.description,
            validation_rules: Array.isArray(field.validation_rules)
              ? field.validation_rules
              : [],
          },
        },
        upsert: true, // if not exists -> insert
      },
    }));

    const res = await MasterField.bulkWrite(ops, { ordered: false });

    console.log(
      `✅ MasterFields bulk seed complete. Matched: ${res.matchedCount} | Modified: ${res.modifiedCount} | Upserted: ${res.upsertedCount}`
    );
  } catch (err) {
    console.error("❌ Bulk seed error:", err);
  }
};

module.exports = { seedMasterFieldsBulk };
