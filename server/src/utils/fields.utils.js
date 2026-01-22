const FIELD_SCHEMA = {
  forms: [
    {
      form_name: "Form_15_Mortgage",
      fields: [
        {
          key: "parcel_identifier_pid",
          label_on_form: "Parcel Identifier: PID",
          type: "string",
          required: true,
          description: "Parcel Identifier (PID) of the mortgaged land.",
        },
        {
          key: "mortgagor_1_name",
          label_on_form: "Mortgagor: Name:",
          type: "string",
          required: true,
          description: "Full name of first mortgagor.",
        },
        {
          key: "mortgagor_1_address",
          label_on_form: "Mortgagor: Address:",
          type: "string",
          required: true,
          description: "Full address of first mortgagor.",
        },
        {
          key: "mortgagor_2_name",
          label_on_form: "Mortgagor: Name: (second mortgagor)",
          type: "string",
          required: false,
          description: "Full name of second mortgagor, if any.",
        },
        {
          key: "mortgagor_2_address",
          label_on_form: "Mortgagor: Address: (second mortgagor)",
          type: "string",
          required: false,
          description: "Full address of second mortgagor, if any.",
        },
        {
          key: "spouse_mortgagor_reference_name",
          label_on_form: "Spouse of (name of mortgagor):",
          type: "string",
          required: false,
          description: "Name of the mortgagor whose spouse is joining.",
        },
        {
          key: "spouse_of_mortgagor_name",
          label_on_form: "Spouse of (name of mortgagor): Name:",
          type: "string",
          required: false,
          description: "Full name of spouse of mortgagor.",
        },
        {
          key: "spouse_of_mortgagor_address",
          label_on_form: "Spouse of (name of mortgagor): Address:",
          type: "string",
          required: false,
          description: "Address of spouse of mortgagor.",
        },
        {
          key: "guarantor_1_name",
          label_on_form: "Guarantor: Name:",
          type: "string",
          required: false,
          description: "Full name of first guarantor.",
        },
        {
          key: "guarantor_1_address",
          label_on_form: "Guarantor: Address:",
          type: "string",
          required: false,
          description: "Address of first guarantor.",
        },
        {
          key: "guarantor_2_name",
          label_on_form: "Guarantor: Name: (second guarantor)",
          type: "string",
          required: false,
          description: "Full name of second guarantor.",
        },
        {
          key: "guarantor_2_address",
          label_on_form: "Guarantor: Address: (second guarantor)",
          type: "string",
          required: false,
          description: "Address of second guarantor.",
        },
        {
          key: "mortgagee_name",
          label_on_form: "Mortgagee: Name:",
          type: "string",
          required: true,
          description: "Name of the mortgagee. Default is 'BANK OF MONTREAL'.",
        },
        {
          key: "mortgagee_address",
          label_on_form: "Mortgagee: Address:",
          type: "string",
          required: true,
          description: "Address of the mortgagee branch.",
        },
        {
          key: "manner_of_tenure",
          label_on_form: "Manner of Tenure:",
          type: "string",
          required: false,
          description:
            "Manner of tenure (e.g., freehold, leasehold). May be 'NOT APPLICABLE'.",
        },
        {
          key: "limitation_of_right_title_interest_mortgaged",
          label_on_form: "Limitation of Right, Title or Interest Mortgaged:",
          type: "string",
          required: false,
          description:
            "Any limitation on the right, title or interest mortgaged.",
        },
        {
          key: "principal_sum_amount",
          label_on_form: "Principal Sum: $",
          type: "number",
          required: true,
          description: "Principal sum in Canadian dollars.",
        },
        {
          key: "principal_sum_text",
          label_on_form: "Principal Sum (text, if any)",
          type: "string",
          required: false,
          description:
            "Principal sum in words, if present elsewhere in the document.",
        },
        {
          key: "interest_rate_percent",
          label_on_form: "Interest Rate:",
          type: "number",
          required: true,
          description: "Annual interest rate as a percentage.",
        },
        {
          key: "interest_rate_text",
          label_on_form: "Interest Rate (text, if any)",
          type: "string",
          required: false,
          description: "Interest rate description in words, if written.",
        },
        {
          key: "how_interest_calculated",
          label_on_form: "How Interest Calculated:",
          type: "string",
          required: false,
          description: "Text describing how interest is calculated.",
        },
        {
          key: "interest_adjustment_date",
          label_on_form: "Interest Adjustment Date:",
          type: "date",
          required: false,
          description: "Interest Adjustment Date.",
        },
        {
          key: "term_description",
          label_on_form: "Term:",
          type: "string",
          required: false,
          description: "Description of the mortgage term (e.g., 5 years).",
        },
        {
          key: "payments_description",
          label_on_form: "Payments:",
          type: "string",
          required: false,
          description:
            "Text describing payment terms, often referring to Schedule 'G'.",
        },
        {
          key: "payment_dates_description",
          label_on_form: "Payment Dates:",
          type: "string",
          required: false,
          description:
            "Details of payment dates, may state 'NOT APPLICABLE' and refer to Schedule 'G'.",
        },
        {
          key: "instalment_date_and_period",
          label_on_form: "Instalment date and period:",
          type: "string",
          required: false,
          description:
            "Description of instalment schedule (e.g., monthly, bi-weekly).",
        },
        {
          key: "first_instalment_date",
          label_on_form: "First instalment date:",
          type: "date",
          required: false,
          description: "First instalment payment date.",
        },
        {
          key: "last_instalment_date",
          label_on_form: "Last instalment date:",
          type: "date",
          required: false,
          description: "Last scheduled instalment date before maturity.",
        },
        {
          key: "maturity_date",
          label_on_form: "Maturity Date:",
          type: "date",
          required: false,
          description: "Maturity date of the mortgage.",
        },
        {
          key: "place_of_payment",
          label_on_form: "Place of Payment:",
          type: "string",
          required: false,
          description: "Place where mortgage payments are to be made.",
        },
        {
          key: "statutory_covenants_excluded",
          label_on_form: "Statutory Covenants and Conditions Excluded:",
          type: "string",
          required: false,
          description:
            "Statutory covenants and conditions excluded. Often 'ALL'.",
        },
        {
          key: "optional_covenants_included",
          label_on_form: "Optional Covenants and Conditions Included:",
          type: "string",
          required: false,
          description:
            "Optional covenants and conditions included. Often 'BMO-4875'.",
        },
        {
          key: "mortgage_form_date",
          label_on_form: "Date:",
          type: "date",
          required: false,
          description: "Execution date of Form 15 mortgage.",
        },
        {
          key: "witness_1_name_for_mortgagor_1",
          label_on_form: "Witness: Name: (for first mortgagor)",
          type: "string",
          required: false,
          description: "Name of witness for first mortgagor.",
        },
        {
          key: "mortgagor_1_signature_name",
          label_on_form: "Mortgagor: Name: (signature block 1)",
          type: "string",
          required: false,
          description: "Name of first mortgagor as it appears near signature.",
        },
        {
          key: "mortgagor_1_signature",
          label_on_form: "Mortgagor: Signature: (first mortgagor)",
          type: "string",
          required: false,
          description: "Signature representation or name for first mortgagor.",
        },
        {
          key: "witness_2_name_for_mortgagor_2",
          label_on_form: "Witness: Name: (for second mortgagor)",
          type: "string",
          required: false,
          description: "Name of witness for second mortgagor.",
        },
        {
          key: "mortgagor_2_signature_name",
          label_on_form: "Mortgagor: Name: (signature block 2)",
          type: "string",
          required: false,
          description: "Name of second mortgagor as it appears near signature.",
        },
        {
          key: "mortgagor_2_signature",
          label_on_form: "Mortgagor: Signature: (second mortgagor)",
          type: "string",
          required: false,
          description: "Signature representation or name for second mortgagor.",
        },
        {
          key: "witness_spouse_name",
          label_on_form: "Witness: Name: (for spouse of mortgagor)",
          type: "string",
          required: false,
          description: "Name of witness for spouse of mortgagor.",
        },
        {
          key: "spouse_of_mortgagor_reference_in_sign_block",
          label_on_form: "Spouse of (name of mortgagor): (in signature block)",
          type: "string",
          required: false,
          description:
            "Name of mortgagor referenced in spouse signature block.",
        },
        {
          key: "spouse_signature_name",
          label_on_form: "Name of spouse:",
          type: "string",
          required: false,
          description: "Name of spouse as written in signature area.",
        },
        {
          key: "spouse_signature",
          label_on_form: "Spouse: Signature:",
          type: "string",
          required: false,
          description: "Signature representation or name of spouse.",
        },
        {
          key: "witness_guarantor_1_name",
          label_on_form: "Witness: Name: (for first guarantor)",
          type: "string",
          required: false,
          description: "Name of witness for first guarantor.",
        },
        {
          key: "guarantor_1_signature_name",
          label_on_form: "Guarantor: Name: (signature block 1)",
          type: "string",
          required: false,
          description:
            "Name of first guarantor as it appears in signature area.",
        },
        {
          key: "guarantor_1_signature",
          label_on_form: "Guarantor: Signature: (first guarantor)",
          type: "string",
          required: false,
          description: "Signature representation or name of first guarantor.",
        },
        {
          key: "witness_guarantor_2_name",
          label_on_form: "Witness: Name: (for second guarantor)",
          type: "string",
          required: false,
          description: "Name of witness for second guarantor.",
        },
        {
          key: "guarantor_2_signature_name",
          label_on_form: "Guarantor: Name: (signature block 2)",
          type: "string",
          required: false,
          description:
            "Name of second guarantor as it appears in signature area.",
        },
        {
          key: "guarantor_2_signature",
          label_on_form: "Guarantor: Signature: (second guarantor)",
          type: "string",
          required: false,
          description: "Signature representation or name of second guarantor.",
        },
      ],
    },
    {
      form_name: "Schedule_G_Memorandum_of_Encumbrances",
      fields: [
        {
          key: "schedule_g_mortgagor_names",
          label_on_form: 'Schedule "G" - To a mortgage between:',
          type: "string",
          required: true,
          description:
            "Name(s) of mortgagor(s) in the introductory line of Schedule G.",
        },
        {
          key: "schedule_g_mortgage_date",
          label_on_form: "and dated .",
          type: "date",
          required: true,
          description: "Date of the mortgage as referenced in Schedule G.",
        },
        {
          key: "schedule_g_mortgage_product_term",
          label_on_form: "1.1 Mortgage Product. You have a ____ term.",
          type: "string",
          required: false,
          description:
            "Description of mortgage product term (e.g., 5-year fixed, variable).",
        },
        {
          key: "schedule_g_fixed_interest_rate_percent",
          label_on_form:
            "Interest rate. For a fixed rate term, ___% per year, calculated half-yearly not in advance.",
          type: "number",
          required: false,
          description: "Interest rate for a fixed rate term as a percentage.",
        },
        {
          key: "schedule_g_prime_rate_reference_date",
          label_on_form: "On ____ , our prime rate was ____%.",
          type: "date",
          required: false,
          description: "Date at which the bank's prime rate is referenced.",
        },
        {
          key: "schedule_g_prime_rate_percent",
          label_on_form: "On [date], our prime rate was ___% per year.",
          type: "number",
          required: false,
          description: "Bank prime rate as a percentage on the reference date.",
        },
        {
          key: "schedule_g_borrower_rate_on_reference_date_percent",
          label_on_form:
            "On that date, your interest rate was ___% per year, calculated monthly not in advance.",
          type: "number",
          required: false,
          description:
            "Borrower's interest rate as a percentage on the same reference date.",
        },
        {
          key: "schedule_g_equivalent_annual_rate_in_advance_percent",
          label_on_form: "This is equivalent to ___% per year in advance.",
          type: "number",
          required: false,
          description: "Equivalent annual rate expressed in advance.",
        },
        {
          key: "schedule_g_variable_rate_terms_text",
          label_on_form:
            "1.3 Variable rate terms / 1.3.1 General Terms / 1.3.3 Other.",
          type: "string",
          required: false,
          description:
            "Any additional text or specifics regarding variable rate terms and other terms in Schedule G.",
        },
        {
          key: "schedule_g_special_terms_text",
          label_on_form: "2. Special Terms.",
          type: "string",
          required: false,
          description:
            "Text of any special terms specified in section 2 of Schedule G.",
        },
      ],
    },
    {
      form_name: "Form_55_Affidavit_of_Marital_Status",
      fields: [
        {
          key: "deponent_1_name",
          label_on_form: "Deponent: (Name) [first]",
          type: "string",
          required: true,
          description: "Name of first deponent.",
        },
        {
          key: "deponent_1_address",
          label_on_form: "Deponent: (Address) [first]",
          type: "string",
          required: true,
          description: "Address of first deponent.",
        },
        {
          key: "deponent_2_name",
          label_on_form: "Deponent: (Name) [second]",
          type: "string",
          required: false,
          description: "Name of second deponent, if any.",
        },
        {
          key: "deponent_2_address",
          label_on_form: "Deponent: (Address) [second]",
          type: "string",
          required: false,
          description: "Address of second deponent, if any.",
        },
        {
          key: "spouse_of_deponent_name",
          label_on_form: "Spouse of Deponent: (Name)",
          type: "string",
          required: false,
          description: "Name of spouse of the deponent(s).",
        },
        {
          key: "spouse_of_deponent_address",
          label_on_form: "Spouse of Deponent: (Address)",
          type: "string",
          required: false,
          description: "Address of spouse of deponent(s).",
        },
        {
          key: "domestic_contract_date",
          label_on_form: "Date of Domestic Contract:",
          type: "date",
          required: false,
          description: "Date of any domestic contract referenced.",
        },
        {
          key: "court_order_date",
          label_on_form: "Date of Court Order:",
          type: "date",
          required: false,
          description: "Date of any court order referenced.",
        },
        {
          key: "clause2_not_married_selected",
          label_on_form: "Clause 2 - That I am/we are not married.",
          type: "boolean",
          required: false,
          description:
            "Indicates that the checkbox/mark for 'not married' is selected.",
        },
        {
          key: "clause2_spouse_name_as_specified_selected",
          label_on_form:
            "Clause 2 - That the name of my spouse is as specified above.",
          type: "boolean",
          required: false,
          description:
            "Indicates that the checkbox/mark for 'spouse name as specified above' is selected.",
        },
        {
          key: "clause3_no_former_spouse_with_right_selected",
          label_on_form:
            "Clause 3 - That I/we have no former spouse with a right under the Marital Property Act...",
          type: "boolean",
          required: false,
          description:
            "Indicates that the deponent(s) affirm there is no former spouse with rights in the subject land.",
        },
        {
          key: "subject_land_occupied_as_marital_home",
          label_on_form:
            "Clause 4 - That the subject land has (not) been occupied by me and my spouse as our marital home.",
          type: "string",
          required: false,
          description:
            "Whether the land has or has not been occupied as a marital home (e.g., 'has', 'has not').",
        },
        {
          key: "clause5_spouse_has_joined_and_consented",
          label_on_form:
            "Clause 5 - That my spouse has joined in this instrument and has consented...",
          type: "boolean",
          required: false,
          description: "Indicates that spouse has joined and consented.",
        },
        {
          key: "clause5_spouse_signature_not_required",
          label_on_form:
            "Clause 5 - The signature of my spouse is not required because:",
          type: "boolean",
          required: false,
          description:
            "Indicates that the spouse's signature is declared not required.",
        },
        {
          key: "clause5_reason_domestic_contract_selected",
          label_on_form:
            "Clause 5 - my spouse has released all rights to the marital home by reason of a domestic contract dated as specified above.",
          type: "boolean",
          required: false,
          description: "Indicates the domestic contract reason is selected.",
        },
        {
          key: "clause5_reason_court_order_release_selected",
          label_on_form:
            "Clause 5 - the marital home has been released by order of The Court of Queen’s Bench of New Brunswick dated as specified above.",
          type: "boolean",
          required: false,
          description: "Indicates the court order release reason is selected.",
        },
        {
          key: "clause5_reason_court_authorization_selected",
          label_on_form:
            "Clause 5 - this disposition has been authorized by The Court of Queen’s Bench of New Brunswick by order dated as specified above.",
          type: "boolean",
          required: false,
          description: "Indicates the court authorization reason is selected.",
        },
        {
          key: "marital_affidavit_sworn_place",
          label_on_form: "(Severally) Sworn before me, at the",
          type: "string",
          required: false,
          description: "Place where the affidavit of marital status is sworn.",
        },
        {
          key: "marital_affidavit_sworn_jurisdiction",
          label_on_form: "in the",
          type: "string",
          required: false,
          description: "Jurisdiction/region where the affidavit is sworn.",
        },
        {
          key: "marital_affidavit_sworn_day",
          label_on_form: "day of",
          type: "number",
          required: false,
          description: "Day of the month when the affidavit is sworn.",
        },
        {
          key: "marital_affidavit_sworn_month",
          label_on_form: "this [month]",
          type: "string",
          required: false,
          description: "Month when the affidavit is sworn.",
        },
        {
          key: "marital_affidavit_sworn_year",
          label_on_form: "20__",
          type: "number",
          required: false,
          description: "Year when the affidavit is sworn.",
        },
        {
          key: "marital_deponent_signature_name",
          label_on_form: "Name: (beside deponent signature)",
          type: "string",
          required: false,
          description: "Name of deponent as signed near the jurat.",
        },
        {
          key: "marital_commissioner_name",
          label_on_form: "A Commissioner Being a Solicitor Name:",
          type: "string",
          required: false,
          description:
            "Name of Commissioner of Oaths / Solicitor for the marital status affidavit.",
        },
        {
          key: "marital_notary_jurisdiction_outside_province",
          label_on_form: "A Notary Public in and for",
          type: "string",
          required: false,
          description:
            "Jurisdiction of the notary public if affidavit is signed outside the province.",
        },
        {
          key: "marital_notary_commission_expiry_date",
          label_on_form: "My Commission expires on __ , 20__.",
          type: "date",
          required: false,
          description:
            "Commission expiry date of the notary public for outside-province execution.",
        },
      ],
    },
    {
      form_name: "Form_43_Affidavit_of_Execution",
      fields: [
        {
          key: "subscribing_witness_name",
          label_on_form: "Subscribing Witness: (Name)",
          type: "string",
          required: true,
          description: "Name of the subscribing witness.",
        },
        {
          key: "subscribing_witness_address",
          label_on_form: "Subscribing Witness: (Address)",
          type: "string",
          required: true,
          description: "Address of the subscribing witness.",
        },
        {
          key: "person_executed_1_name",
          label_on_form:
            "Person(s) Who Executed the Instrument: (Name) [first]",
          type: "string",
          required: true,
          description: "Name of first person who executed the instrument.",
        },
        {
          key: "person_executed_2_name",
          label_on_form:
            "Person(s) Who Executed the Instrument: (Name) [second]",
          type: "string",
          required: false,
          description:
            "Name of second person who executed the instrument, if any.",
        },
        {
          key: "affidavit_execution_place_of_execution",
          label_on_form: "Place of Execution:",
          type: "string",
          required: true,
          description: "Place where the instrument was executed.",
        },
        {
          key: "affidavit_execution_date_of_execution",
          label_on_form: "Date of Execution:",
          type: "date",
          required: true,
          description: "Date when the instrument was executed.",
        },
        {
          key: "execution_affidavit_sworn_place",
          label_on_form: "Sworn before me, at the",
          type: "string",
          required: false,
          description: "Place where the affidavit of execution is sworn.",
        },
        {
          key: "execution_affidavit_sworn_jurisdiction",
          label_on_form: "in the",
          type: "string",
          required: false,
          description:
            "Jurisdiction/region where the affidavit of execution is sworn.",
        },
        {
          key: "execution_affidavit_sworn_day",
          label_on_form: "day of",
          type: "number",
          required: false,
          description: "Day of the month when the affidavit is sworn.",
        },
        {
          key: "execution_affidavit_sworn_month",
          label_on_form: "this [month]",
          type: "string",
          required: false,
          description: "Month when the affidavit is sworn.",
        },
        {
          key: "execution_affidavit_sworn_year",
          label_on_form: "20__",
          type: "number",
          required: false,
          description: "Year when the affidavit is sworn.",
        },
        {
          key: "execution_deponent_signature_name",
          label_on_form: "Name: (subscribing witness near jurat)",
          type: "string",
          required: false,
          description: "Name of subscribing witness as signed near jurat.",
        },
        {
          key: "execution_commissioner_name",
          label_on_form: "A Commissioner Being a Solicitor Name:",
          type: "string",
          required: false,
          description:
            "Name of Commissioner of Oaths / Solicitor for the affidavit of execution.",
        },
        {
          key: "execution_notary_jurisdiction_outside_province",
          label_on_form: "A Notary Public in and for",
          type: "string",
          required: false,
          description:
            "Jurisdiction of the notary public if this affidavit is signed outside the province.",
        },
        {
          key: "execution_notary_commission_expiry_date",
          label_on_form: "My Commission expires on __ , 20__.",
          type: "date",
          required: false,
          description:
            "Commission expiry date of the notary public for outside-province execution.",
        },
      ],
    },
    {
      form_name: "Form_44_Certificate_of_Execution",
      fields: [
        {
          key: "notary_public_name",
          label_on_form: "Notary Public: (Name)",
          type: "string",
          required: true,
          description: "Name of the Notary Public.",
        },
        {
          key: "notary_public_address",
          label_on_form: "Notary Public: (Address)",
          type: "string",
          required: true,
          description: "Address of the Notary Public.",
        },
        {
          key: "notary_public_jurisdiction",
          label_on_form: "Jurisdiction:",
          type: "string",
          required: true,
          description: "Jurisdiction in which the Notary Public is authorized.",
        },
        {
          key: "notary_place_of_residence",
          label_on_form: "Place of Residence of Notary Public:",
          type: "string",
          required: true,
          description: "Place of residence of the Notary Public.",
        },
        {
          key: "certificate_person_executed_1_name",
          label_on_form:
            "Person(s) Who Executed the Instrument: (Name) [first]",
          type: "string",
          required: true,
          description: "Name of first person who executed the instrument.",
        },
        {
          key: "certificate_person_executed_2_name",
          label_on_form:
            "Person(s) Who Executed the Instrument: (Name) [second]",
          type: "string",
          required: false,
          description:
            "Name of second person who executed the instrument, if any.",
        },
        {
          key: "certificate_place_of_execution",
          label_on_form: "Place of Execution:",
          type: "string",
          required: true,
          description: "Place where the instrument was executed.",
        },
        {
          key: "certificate_date_of_execution",
          label_on_form: "Date of Execution:",
          type: "date",
          required: true,
          description: "Date when the instrument was executed.",
        },
        {
          key: "certificate_place_final",
          label_on_form: "Place:",
          type: "string",
          required: false,
          description:
            "Place indicated at the end of the Certificate of Execution.",
        },
        {
          key: "certificate_date_final",
          label_on_form: "Date:",
          type: "date",
          required: false,
          description:
            "Date indicated at the end of the Certificate of Execution.",
        },
        {
          key: "certificate_notary_signature_name",
          label_on_form: "Notary Public:",
          type: "string",
          required: false,
          description:
            "Name of Notary Public as signed under the final signature line.",
        },
      ],
    },
  ],
};

module.exports = FIELD_SCHEMA;