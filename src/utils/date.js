const monthLabels = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

const monthNames = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

export const parseDate = (value) => {
  if (!value) return null;
  return new Date(`${value}T00:00:00`);
};

export const formatMonthLabel = (date) => {
  const month = monthLabels[date.getMonth()];
  const year = String(date.getFullYear()).slice(-2);
  return `${month}/${year}`;
};

export const formatMonthLong = (date) => {
  const month = monthNames[date.getMonth()];
  return `${month} ${date.getFullYear()}`;
};

export const getMonthKey = (date) => {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${date.getFullYear()}-${month}`;
};

export const getLastMonths = (count, baseDate = new Date()) => {
  const base = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  return Array.from({ length: count }, (_, index) => {
    const date = new Date(base.getFullYear(), base.getMonth() - (count - 1 - index), 1);
    return {
      key: getMonthKey(date),
      label: formatMonthLabel(date),
      date,
    };
  });
};

export const isSameMonth = (date, compare) => {
  return (
    date.getFullYear() === compare.getFullYear() &&
    date.getMonth() === compare.getMonth()
  );
};

export const addMonths = (date, monthsToAdd) => {
  const next = new Date(date);
  next.setMonth(next.getMonth() + monthsToAdd);
  return next;
};

export const getMonthOptionsFromDates = (dates) => {
  const validDates = dates.filter(Boolean);
  let startDate;
  let endDate;

  if (validDates.length === 0) {
    const now = new Date();
    startDate = new Date(now.getFullYear(), now.getMonth(), 1);
    endDate = new Date(startDate);
  } else {
    let minTime = validDates[0].getTime();
    let maxTime = validDates[0].getTime();
    validDates.forEach((date) => {
      const time = date.getTime();
      if (time < minTime) minTime = time;
      if (time > maxTime) maxTime = time;
    });
    const minDate = new Date(minTime);
    const maxDate = new Date(maxTime);
    startDate = new Date(minDate.getFullYear(), minDate.getMonth(), 1);
    endDate = new Date(maxDate.getFullYear(), maxDate.getMonth(), 1);
  }

  const options = [];
  let cursor = new Date(startDate);
  while (true) {
    options.push({
      value: getMonthKey(cursor),
      label: formatMonthLong(cursor),
      date: new Date(cursor),
    });
    if (
      cursor.getFullYear() === endDate.getFullYear() &&
      cursor.getMonth() === endDate.getMonth()
    ) {
      break;
    }
    cursor = addMonths(cursor, 1);
  }

  return options;
};

export const toIsoDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
