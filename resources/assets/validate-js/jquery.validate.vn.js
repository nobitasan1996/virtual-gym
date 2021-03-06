/*
 * Translated default messages for the jQuery validation plugin.
 * Locale: vn
 */
jQuery.extend(jQuery.validator.messages, {
                required: "Required",
		remote: "Let's edit this part.",
		email: "Let's fill a correct email.",
		url: "Let's fill a correct URL.",
		date: "Let's fill a valid date.",
		dateISO: "Let's fill a valid date (ISO).",
		number: "Let's fill a valid number.",
		digits: "Let's fill number.",
		creditcard: "Let's enter valid card number.",
		equalTo: "Let's re-enter these value.",
		maxlength: $.validator.format("Let's enter no more than {0} character."),
		minlength: $.validator.format("Let's enter at least {0} character."),
		rangelength: $.validator.format("Let's enter value from {0} and {1} character."),
		range: $.validator.format("Let's enter value from {0} and {1}."),
//		max: $.validator.format("Hãy nhập giá trị nhỏ hơn hoặc bằng {0}."),
//		min: $.validator.format("Hãy nhập giá trị lớn hơn hoặc bằng {0}.")
		max: $.validator.format("Invalid value"),
		min: $.validator.format("Invalid value")
});