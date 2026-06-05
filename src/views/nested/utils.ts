export function getPickerShortcuts() {
  return [
    {
      text: "今天",
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setHours(0, 0, 0, 0);
        return [start, end];
      }
    },
    {
      text: "昨天",
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setTime(start.getTime() - 3600 * 1000 * 24);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);
        return [start, end];
      }
    },
    {
      text: "最近7天",
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 7);
        return [start, end];
      }
    },
    {
      text: "最近30天",
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setTime(start.getTime() - 3600 * 1000 * 24 * 30);
        return [start, end];
      }
    },
    {
      text: "本月",
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
        return [start, end];
      }
    },
    {
      text: "今年",
      value: () => {
        const end = new Date();
        const start = new Date();
        start.setMonth(0, 1);
        start.setHours(0, 0, 0, 0);
        return [start, end];
      }
    }
  ];
}

// 防抖函数
export function debounce(fn: Function, delay: number) {
  let timer: NodeJS.Timeout;
  return function (...args: any[]) {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => {
      fn.apply(this, args);
    }, delay);
  };
}

// 节流函数
export function throttle(fn: Function, delay: number) {
  let lastTime = 0;
  return function (...args: any[]) {
    const now = Date.now();
    if (now - lastTime >= delay) {
      fn.apply(this, args);
      lastTime = now;
    }
  };
}

// 格式化时间
export function formatTime(
  date: Date | string,
  format = "YYYY-MM-DD HH:mm:ss"
) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  const second = String(d.getSeconds()).padStart(2, "0");

  return format
    .replace("YYYY", year.toString())
    .replace("MM", month)
    .replace("DD", day)
    .replace("HH", hour)
    .replace("mm", minute)
    .replace("ss", second);
}

// 深拷贝
export function deepClone(obj: any): any {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
  return obj;
}
