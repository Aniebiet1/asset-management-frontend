export interface TimezoneOption {
  value: string;
  label: string;
  region: string;
  offset: string;
}

export const WORLD_TIMEZONES: TimezoneOption[] = [
  // UTC / Universal
  { value: "UTC", label: "UTC (Coordinated Universal Time)", region: "Global", offset: "UTC+00:00" },
  { value: "GMT", label: "GMT (Greenwich Mean Time)", region: "Global", offset: "UTC+00:00" },

  // Africa
  { value: "Africa/Lagos", label: "Lagos, Nigeria (WAT)", region: "Africa", offset: "UTC+01:00" },
  { value: "Africa/Accra", label: "Accra, Ghana (GMT)", region: "Africa", offset: "UTC+00:00" },
  { value: "Africa/Cairo", label: "Cairo, Egypt (EET)", region: "Africa", offset: "UTC+02:00" },
  { value: "Africa/Johannesburg", label: "Johannesburg, South Africa (SAST)", region: "Africa", offset: "UTC+02:00" },
  { value: "Africa/Nairobi", label: "Nairobi, Kenya (EAT)", region: "Africa", offset: "UTC+03:00" },
  { value: "Africa/Casablanca", label: "Casablanca, Morocco (WEST)", region: "Africa", offset: "UTC+01:00" },
  { value: "Africa/Addis_Ababa", label: "Addis Ababa, Ethiopia (EAT)", region: "Africa", offset: "UTC+03:00" },
  { value: "Africa/Algiers", label: "Algiers, Algeria (CET)", region: "Africa", offset: "UTC+01:00" },
  { value: "Africa/Kigali", label: "Kigali, Rwanda (CAT)", region: "Africa", offset: "UTC+02:00" },

  // Americas - North
  { value: "America/New_York", label: "New York, USA (Eastern)", region: "Americas", offset: "UTC-05:00" },
  { value: "America/Chicago", label: "Chicago, USA (Central)", region: "Americas", offset: "UTC-06:00" },
  { value: "America/Denver", label: "Denver, USA (Mountain)", region: "Americas", offset: "UTC-07:00" },
  { value: "America/Los_Angeles", label: "Los Angeles, USA (Pacific)", region: "Americas", offset: "UTC-08:00" },
  { value: "America/Anchorage", label: "Anchorage, USA (Alaska)", region: "Americas", offset: "UTC-09:00" },
  { value: "Pacific/Honolulu", label: "Honolulu, USA (Hawaii)", region: "Americas", offset: "UTC-10:00" },
  { value: "America/Phoenix", label: "Phoenix, USA (MST - No DST)", region: "Americas", offset: "UTC-07:00" },
  { value: "America/Toronto", label: "Toronto, Canada (EDT)", region: "Americas", offset: "UTC-05:00" },
  { value: "America/Vancouver", label: "Vancouver, Canada (PDT)", region: "Americas", offset: "UTC-08:00" },
  { value: "America/Mexico_City", label: "Mexico City, Mexico (CST)", region: "Americas", offset: "UTC-06:00" },

  // Americas - South & Central
  { value: "America/Sao_Paulo", label: "São Paulo, Brazil (BRT)", region: "Americas", offset: "UTC-03:00" },
  { value: "America/Buenos_Aires", label: "Buenos Aires, Argentina (ART)", region: "Americas", offset: "UTC-03:00" },
  { value: "America/Bogota", label: "Bogotá, Colombia (COT)", region: "Americas", offset: "UTC-05:00" },
  { value: "America/Lima", label: "Lima, Peru (PET)", region: "Americas", offset: "UTC-05:00" },
  { value: "America/Santiago", label: "Santiago, Chile (CLT)", region: "Americas", offset: "UTC-04:00" },
  { value: "America/Caracas", label: "Caracas, Venezuela (VET)", region: "Americas", offset: "UTC-04:00" },

  // Europe
  { value: "Europe/London", label: "London, UK (BST / GMT)", region: "Europe", offset: "UTC+00:00" },
  { value: "Europe/Dublin", label: "Dublin, Ireland (IST)", region: "Europe", offset: "UTC+00:00" },
  { value: "Europe/Paris", label: "Paris, France (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Berlin", label: "Berlin, Germany (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Madrid", label: "Madrid, Spain (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Rome", label: "Rome, Italy (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Amsterdam", label: "Amsterdam, Netherlands (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Brussels", label: "Brussels, Belgium (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Stockholm", label: "Stockholm, Sweden (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Zurich", label: "Zurich, Switzerland (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Vienna", label: "Vienna, Austria (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Warsaw", label: "Warsaw, Poland (CEST)", region: "Europe", offset: "UTC+01:00" },
  { value: "Europe/Athens", label: "Athens, Greece (EEST)", region: "Europe", offset: "UTC+02:00" },
  { value: "Europe/Bucharest", label: "Bucharest, Romania (EEST)", region: "Europe", offset: "UTC+02:00" },
  { value: "Europe/Helsinki", label: "Helsinki, Finland (EEST)", region: "Europe", offset: "UTC+02:00" },
  { value: "Europe/Moscow", label: "Moscow, Russia (MSK)", region: "Europe", offset: "UTC+03:00" },
  { value: "Europe/Istanbul", label: "Istanbul, Turkey (TRT)", region: "Europe", offset: "UTC+03:00" },

  // Middle East
  { value: "Asia/Dubai", label: "Dubai / Abu Dhabi, UAE (GST)", region: "Middle East", offset: "UTC+04:00" },
  { value: "Asia/Riyadh", label: "Riyadh, Saudi Arabia (AST)", region: "Middle East", offset: "UTC+03:00" },
  { value: "Asia/Doha", label: "Doha, Qatar (AST)", region: "Middle East", offset: "UTC+03:00" },
  { value: "Asia/Kuwait", label: "Kuwait City, Kuwait (AST)", region: "Middle East", offset: "UTC+03:00" },
  { value: "Asia/Jerusalem", label: "Jerusalem, Israel (IDT)", region: "Middle East", offset: "UTC+02:00" },
  { value: "Asia/Beirut", label: "Beirut, Lebanon (EEST)", region: "Middle East", offset: "UTC+02:00" },
  { value: "Asia/Tehran", label: "Tehran, Iran (IRST)", region: "Middle East", offset: "UTC+03:30" },

  // Asia - South & Central
  { value: "Asia/Kolkata", label: "Mumbai / New Delhi, India (IST)", region: "Asia", offset: "UTC+05:30" },
  { value: "Asia/Karachi", label: "Karachi / Islamabad, Pakistan (PKT)", region: "Asia", offset: "UTC+05:00" },
  { value: "Asia/Dhaka", label: "Dhaka, Bangladesh (BST)", region: "Asia", offset: "UTC+06:00" },
  { value: "Asia/Colombo", label: "Colombo, Sri Lanka (IST)", region: "Asia", offset: "UTC+05:30" },
  { value: "Asia/Kathmandu", label: "Kathmandu, Nepal (NPT)", region: "Asia", offset: "UTC+05:45" },
  { value: "Asia/Tashkent", label: "Tashkent, Uzbekistan (UZT)", region: "Asia", offset: "UTC+05:00" },
  { value: "Asia/Almaty", label: "Almaty, Kazakhstan (ALMT)", region: "Asia", offset: "UTC+06:00" },

  // Asia - East & Southeast
  { value: "Asia/Singapore", label: "Singapore (SGT)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Hong_Kong", label: "Hong Kong (HKT)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Shanghai", label: "Beijing / Shanghai, China (CST)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Tokyo", label: "Tokyo, Japan (JST)", region: "Asia", offset: "UTC+09:00" },
  { value: "Asia/Seoul", label: "Seoul, South Korea (KST)", region: "Asia", offset: "UTC+09:00" },
  { value: "Asia/Bangkok", label: "Bangkok, Thailand (ICT)", region: "Asia", offset: "UTC+07:00" },
  { value: "Asia/Jakarta", label: "Jakarta, Indonesia (WIB)", region: "Asia", offset: "UTC+07:00" },
  { value: "Asia/Manila", label: "Manila, Philippines (PHT)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Kuala_Lumpur", label: "Kuala Lumpur, Malaysia (MYT)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Taipei", label: "Taipei, Taiwan (CST)", region: "Asia", offset: "UTC+08:00" },
  { value: "Asia/Ho_Chi_Minh", label: "Ho Chi Minh City, Vietnam (ICT)", region: "Asia", offset: "UTC+07:00" },

  // Australia & Pacific
  { value: "Australia/Sydney", label: "Sydney / Melbourne, Australia (AEST)", region: "Pacific", offset: "UTC+10:00" },
  { value: "Australia/Brisbane", label: "Brisbane, Australia (AEST - No DST)", region: "Pacific", offset: "UTC+10:00" },
  { value: "Australia/Adelaide", label: "Adelaide, Australia (ACST)", region: "Pacific", offset: "UTC+09:30" },
  { value: "Australia/Perth", label: "Perth, Australia (AWST)", region: "Pacific", offset: "UTC+08:00" },
  { value: "Pacific/Auckland", label: "Auckland, New Zealand (NZST)", region: "Pacific", offset: "UTC+12:00" },
  { value: "Pacific/Fiji", label: "Suva, Fiji (FJT)", region: "Pacific", offset: "UTC+12:00" },
];
