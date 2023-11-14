import * as moment from "moment";

// Here we set moment to use ISO-8601, Europe locale.
moment.updateLocale("en", {
  week: {
    dow: 1, // First day of week is Monday
    doy: 4, // First week of year must contain 4 January (7 + 1 - 4)
  },
});

export default moment;
