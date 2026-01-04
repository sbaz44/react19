import React, {
  useState,
  useEffect,
  useRef,
  useCallback,
  useMemo,
  memo,
} from "react";
import "./TimeSchedule.scss";

// Constants
const SLOT_WIDTH = 100; // pixels per time slot
const PIXELS_PER_MINUTE = SLOT_WIDTH / 10; // pixels per minute
const WINDOW_HOURS_BEFORE = 4; // Hours before current time to render
const WINDOW_HOURS_AFTER = 4; // Hours after current time to render
const EXTEND_THRESHOLD_MINUTES = 30; // Extend when this many minutes remain
const EXTEND_BY_HOURS = 2; // Extend by this many hours
const TRIM_HOURS_BEFORE = 2; // Remove cells older than this many hours

// Memoized format functions
const formatDate = (date) => {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "Jan",
    "Feb",
    "Mar",
    "Apr",
    "May",
    "Jun",
    "Jul",
    "Aug",
    "Sep",
    "Oct",
    "Nov",
    "Dec",
  ];

  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const dateNum = date.getDate().toString().padStart(2, "0");

  return `${day} ${dateNum} ${month}`;
};

// Format date in full format: "Monday 5 January"
const formatDateFull = (date) => {
  const days = [
    "Sunday",
    "Monday",
    "Tuesday",
    "Wednesday",
    "Thursday",
    "Friday",
    "Saturday",
  ];
  const months = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  const day = days[date.getDay()];
  const month = months[date.getMonth()];
  const dateNum = date.getDate(); // No zero padding

  return `${day} ${dateNum} ${month}`;
};

const formatTime = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours}:${minutes.toString().padStart(2, "0")}${ampm}`;
};

const formatTimeWithSeconds = (date) => {
  let hours = date.getHours();
  const minutes = date.getMinutes();
  const seconds = date.getSeconds();
  const ampm = hours >= 12 ? "pm" : "am";
  hours = hours % 12;
  hours = hours ? hours : 12;

  return `${hours}:${minutes.toString().padStart(2, "0")}:${seconds
    .toString()
    .padStart(2, "0")} ${ampm}`;
};

// Memoized cell component to prevent unnecessary re-renders
const TimelineCell = memo(
  ({ slot, rowIndex, currentTime, onCellClick, SLOT_WIDTH }) => {
    const slotTime = slot.getTime();
    const currentTimeMs = currentTime.getTime();
    const slotEndTime = slotTime + 10 * 60 * 1000;

    const isPast = slotEndTime <= currentTimeMs;
    const isCurrent = slotTime <= currentTimeMs && currentTimeMs < slotEndTime;

    const handleClick = (e) => {
      onCellClick(slot, rowIndex, e);
    };

    return (
      <div
        className={`row-cell ${isPast ? "past-cell" : ""} ${
          isCurrent ? "current-cell" : ""
        }`}
        style={{ width: `${SLOT_WIDTH}px` }}
        onClick={handleClick}
      >
        <div className="dotted-line"></div>
      </div>
    );
  },
  (prevProps, nextProps) => {
    // Only re-render if relevant props change
    const prevSlotTime = prevProps.slot.getTime();
    const nextSlotTime = nextProps.slot.getTime();
    const prevCurrentTime = prevProps.currentTime.getTime();
    const nextCurrentTime = nextProps.currentTime.getTime();
    const slotDuration = 10 * 60 * 1000;

    // Check if slot or row changed
    if (
      prevSlotTime !== nextSlotTime ||
      prevProps.rowIndex !== nextProps.rowIndex
    ) {
      return false; // Re-render
    }

    // Check if past/current status changed
    const prevIsPast = prevSlotTime + slotDuration <= prevCurrentTime;
    const nextIsPast = nextSlotTime + slotDuration <= nextCurrentTime;
    const prevIsCurrent =
      prevSlotTime <= prevCurrentTime &&
      prevCurrentTime < prevSlotTime + slotDuration;
    const nextIsCurrent =
      nextSlotTime <= nextCurrentTime &&
      nextCurrentTime < nextSlotTime + slotDuration;

    // Only skip re-render if status hasn't changed
    return prevIsPast === nextIsPast && prevIsCurrent === nextIsCurrent;
  }
);

TimelineCell.displayName = "TimelineCell";

const TimeSchedule = ({ start, end, onCellClick, startTime = null }) => {
  const [currentTime, setCurrentTime] = useState(startTime || new Date());
  const [isPlaying, setIsPlaying] = useState(false);
  const [headersScrollLeft, setHeadersScrollLeft] = useState(0);
  const scrollContainerRef = useRef(null);
  const headersInnerRef = useRef(null);
  const timelineRef = useRef(null);
  const animationFrameRef = useRef(null);
  const scrollAnimationRef = useRef(null);
  const isManualScrollRef = useRef(false);
  const pendingScrollTimeRef = useRef(null);

  // Generate visible time slots using sliding window approach
  // Only renders cells within a fixed window around current time
  const timeSlots = useMemo(() => {
    if (!currentTime) return [];

    // Calculate window boundaries
    const windowStartTime = new Date(currentTime);
    windowStartTime.setHours(windowStartTime.getHours() - WINDOW_HOURS_BEFORE);
    windowStartTime.setMinutes(
      Math.floor(windowStartTime.getMinutes() / 10) * 10
    );
    windowStartTime.setSeconds(0);
    windowStartTime.setMilliseconds(0);

    const windowEndTime = new Date(currentTime);
    windowEndTime.setHours(windowEndTime.getHours() + WINDOW_HOURS_AFTER);
    windowEndTime.setMinutes(Math.ceil(windowEndTime.getMinutes() / 10) * 10);
    windowEndTime.setSeconds(0);
    windowEndTime.setMilliseconds(0);

    // Generate slots
    const slots = [];
    const current = new Date(windowStartTime);

    while (current <= windowEndTime) {
      slots.push(new Date(current));
      current.setMinutes(current.getMinutes() + 10);
    }

    return slots;
  }, [currentTime]);

  // Group time slots by date to create date headers
  const dateHeaders = useMemo(() => {
    if (!timeSlots.length) return [];

    const headers = [];
    let currentDate = null;
    let startIndex = 0;

    timeSlots.forEach((slot, index) => {
      const slotDate = new Date(slot);
      slotDate.setHours(0, 0, 0, 0);

      if (!currentDate || slotDate.getTime() !== currentDate.getTime()) {
        // If we had a previous date, save it
        if (currentDate !== null) {
          headers.push({
            date: new Date(currentDate),
            startIndex: startIndex,
            endIndex: index - 1,
            slotCount: index - startIndex,
          });
        }

        // Start new date
        currentDate = slotDate;
        startIndex = index;
      }
    });

    // Add the last date
    if (currentDate !== null) {
      headers.push({
        date: new Date(currentDate),
        startIndex: startIndex,
        endIndex: timeSlots.length - 1,
        slotCount: timeSlots.length - startIndex,
      });
    }

    return headers;
  }, [timeSlots]);

  // Smooth scroll animation helper
  const smoothScrollTo = useCallback((targetScroll, duration = 400) => {
    const contentContainer = scrollContainerRef.current;
    const headersInner = headersInnerRef.current;

    if (!contentContainer) return;

    // Cancel any existing animation
    if (scrollAnimationRef.current) {
      cancelAnimationFrame(scrollAnimationRef.current);
    }

    const startScroll = contentContainer.scrollLeft;
    const distance = targetScroll - startScroll;
    const startTime = performance.now();

    // Easing function (ease-out)
    const easeOutCubic = (t) => 1 - Math.pow(1 - t, 3);

    const animate = (currentTime) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easeOutCubic(progress);

      const currentScroll = startScroll + distance * easedProgress;
      contentContainer.scrollLeft = currentScroll;

      // Sync headers transform
      if (headersInner) {
        headersInner.style.transform = `translateX(-${currentScroll}px)`;
      }
      setHeadersScrollLeft(currentScroll);

      if (progress < 1) {
        scrollAnimationRef.current = requestAnimationFrame(animate);
      } else {
        scrollAnimationRef.current = null;
      }
    };

    scrollAnimationRef.current = requestAnimationFrame(animate);
  }, []);

  // Calculate and apply scroll position
  const scrollToTime = useCallback(
    (targetTime, smooth = false) => {
      if (!scrollContainerRef.current || !timeSlots.length) return;

      // Cancel any pending animation
      if (scrollAnimationRef.current) {
        cancelAnimationFrame(scrollAnimationRef.current);
        scrollAnimationRef.current = null;
      }

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }

      animationFrameRef.current = requestAnimationFrame(() => {
        if (!scrollContainerRef.current || !timeSlots.length) return;

        const containerWidth = scrollContainerRef.current.offsetWidth;
        const centerPosition = containerWidth / 2;

        // Calculate minutes from the first slot
        const firstSlotTime = timeSlots[0];
        const timeDiff = targetTime - firstSlotTime;
        const minutesDiff = timeDiff / (1000 * 60);

        // Calculate pixel position
        const targetPixelPosition = minutesDiff * PIXELS_PER_MINUTE;
        const scrollPosition = targetPixelPosition - centerPosition;
        const scrollValue = Math.max(0, scrollPosition);

        if (smooth) {
          // Use smooth animation for user clicks
          smoothScrollTo(scrollValue, 400);
        } else {
          // Instant scroll for automatic updates (playback, etc.)
          scrollContainerRef.current.scrollLeft = scrollValue;

          // Sync headers transform
          if (headersInnerRef.current) {
            headersInnerRef.current.style.transform = `translateX(-${scrollValue}px)`;
          }
          setHeadersScrollLeft(scrollValue);
        }
      });
    },
    [timeSlots, smoothScrollTo]
  );

  // Check if timeline needs extension (now handled by sliding window)
  // This is kept for potential future use but window auto-adjusts
  const checkAndExtendTimeline = useCallback(() => {
    // With sliding window, extension happens automatically
    // But we can still check if we're approaching the end of the original range
    if (end && currentTime) {
      const timeDiff = end - currentTime;
      const minutesRemaining = timeDiff / (1000 * 60);

      // Log warning if approaching original end (optional)
      if (minutesRemaining < EXTEND_THRESHOLD_MINUTES) {
        // Window will automatically extend, but we can add logic here if needed
      }
    }
  }, [currentTime, end]);

  // Timer effect - optimized to batch updates
  useEffect(() => {
    let interval;
    let rafId;

    if (isPlaying) {
      interval = setInterval(() => {
        // Use requestAnimationFrame for smoother updates
        rafId = requestAnimationFrame(() => {
          setCurrentTime((prev) => new Date(prev.getTime() + 1000));
        });
      }, 1000);
    }

    return () => {
      if (interval) clearInterval(interval);
      if (rafId) cancelAnimationFrame(rafId);
    };
  }, [isPlaying]);

  // Scroll when current time changes - debounced
  useEffect(() => {
    // Skip if manual scroll is in progress
    if (isManualScrollRef.current) return;

    const timeoutId = setTimeout(() => {
      // Only auto-scroll if not manually scrolling
      if (!isManualScrollRef.current) {
        scrollToTime(currentTime, false);
        checkAndExtendTimeline();
      }
    }, 50); // Small debounce to batch rapid updates

    return () => clearTimeout(timeoutId);
  }, [currentTime, scrollToTime, checkAndExtendTimeline]);

  // Initial positioning
  useEffect(() => {
    // Small delay to ensure DOM is ready
    const timer = setTimeout(() => {
      scrollToTime(currentTime);
    }, 100);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Handle pending scroll after timeSlots update (for click events)
  useEffect(() => {
    if (
      pendingScrollTimeRef.current &&
      timeSlots.length > 0 &&
      isManualScrollRef.current
    ) {
      const targetTime = pendingScrollTimeRef.current;
      pendingScrollTimeRef.current = null;

      // Use scrollToTime with smooth animation - it will use the updated timeSlots
      requestAnimationFrame(() => {
        scrollToTime(targetTime, true);
      });

      // Reset flag after animation completes
      setTimeout(() => {
        isManualScrollRef.current = false;
      }, 450);
    }
  }, [timeSlots, scrollToTime]);

  // Sync scroll between headers and content using transform
  useEffect(() => {
    const contentContainer = scrollContainerRef.current;
    const headersInner = headersInnerRef.current;

    if (!contentContainer || !headersInner) return;

    const handleContentScroll = () => {
      const scrollLeft = contentContainer.scrollLeft;
      setHeadersScrollLeft(scrollLeft);
      // Apply transform to headers to match scroll position
      headersInner.style.transform = `translateX(-${scrollLeft}px)`;
    };

    contentContainer.addEventListener("scroll", handleContentScroll);

    // Initial sync
    handleContentScroll();

    return () => {
      contentContainer.removeEventListener("scroll", handleContentScroll);
    };
  }, [timeSlots]); // Re-run when timeSlots change

  // Handle cell click - memoized to prevent recreation
  const handleCellClick = useCallback(
    (timeSlot, rowIndex, event) => {
      event.stopPropagation();

      const rect = event.currentTarget.getBoundingClientRect();
      const relativeX = event.clientX - rect.left;
      const cellWidth = rect.width;
      const positionInCell = relativeX / cellWidth;

      // Calculate clicked time with precision
      const slotStartTime = new Date(timeSlot);
      const minutesIntoSlot = positionInCell * 10;
      const totalMinutes = slotStartTime.getMinutes() + minutesIntoSlot;
      const totalSeconds = (minutesIntoSlot % 1) * 60;

      const clickedTime = new Date(slotStartTime);
      clickedTime.setMinutes(Math.floor(totalMinutes));
      clickedTime.setSeconds(Math.floor(totalSeconds));

      // Pause when clicking
      setIsPlaying(false);

      // Mark as manual scroll to prevent useEffect from interfering
      isManualScrollRef.current = true;

      // Store the clicked time to scroll after timeSlots updates
      pendingScrollTimeRef.current = clickedTime;

      // Update current time (this will trigger timeSlots recalculation)
      setCurrentTime(clickedTime);

      // Call the callback if provided
      if (onCellClick) {
        const clickData = {
          clickedTime: clickedTime,
          slotStartTime: slotStartTime,
          row: rowIndex + 1,
          formattedTime: formatTimeWithSeconds(clickedTime),
          isoTime: clickedTime.toISOString(),
        };
        onCellClick(clickData);
      }
    },
    [onCellClick]
  );

  const numberOfRows = 1;

  // Memoize formatted time display
  const formattedCurrentTime = useMemo(
    () => formatTimeWithSeconds(currentTime),
    [currentTime]
  );

  // Memoize timeline info
  const timelineInfo = useMemo(() => {
    if (!timeSlots.length) return "";
    return `${formatTime(timeSlots[0])} - ${formatTime(
      timeSlots[timeSlots.length - 1]
    )}`;
  }, [timeSlots]);

  // Memoize header date - updates based on currentTime to show correct date when crossing midnight
  const headerDate = useMemo(() => {
    // Use currentTime to show the date of the currently displayed time
    // This ensures the date updates when navigating past midnight
    return formatDate(currentTime);
  }, [currentTime]);

  // Memoize row indices to prevent recreation
  const rowIndices = useMemo(
    () => Array.from({ length: numberOfRows }, (_, i) => i),
    [numberOfRows]
  );

  return (
    <div className="time-schedule">
      <div className="schedule-header">
        <div className="date-label">{headerDate}</div>
        <div className="timer-controls">
          <div className="current-time-display">{formattedCurrentTime}</div>
          <button
            className="play-pause-btn"
            onClick={() => setIsPlaying(!isPlaying)}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </button>
          <button
            className="reset-btn"
            onClick={() => {
              setCurrentTime(startTime || new Date());
              setIsPlaying(false);
            }}
          >
            ↺ Reset
          </button>
        </div>
      </div>

      <div className="schedule-container">
        <div className="time-indicator">
          <div className="indicator-line"></div>
          <div className="indicator-label">NOW</div>
        </div>

        {/* Sticky Headers - Outside scroll container */}
        <div className="headers-wrapper">
          <div className="headers-inner" ref={headersInnerRef}>
            {/* Date Header Row */}
            <div className="date-header">
              {dateHeaders.map((header, idx) => (
                <div
                  key={`date-${header.date.getTime()}-${idx}`}
                  className="date-header-cell"
                  style={{
                    width: `${header.slotCount * SLOT_WIDTH}px`,
                    minWidth: `${header.slotCount * SLOT_WIDTH}px`,
                  }}
                >
                  {formatDateFull(header.date)}
                </div>
              ))}
            </div>

            {/* Time Header Row */}
            <div className="time-header">
              {timeSlots.map((slot) => (
                <div
                  key={`slot-${slot.getTime()}`}
                  className="time-slot"
                  style={{ width: `${SLOT_WIDTH}px` }}
                >
                  {formatTime(slot)}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scrollable Content - Only rows scroll */}
        <div className="schedule-content" ref={scrollContainerRef}>
          <div className="timeline-wrapper" ref={timelineRef}>
            <div className="schedule-rows">
              {rowIndices.map((rowIndex) => (
                <div key={`row-${rowIndex}`} className="schedule-row">
                  {timeSlots.map((slot) => (
                    <TimelineCell
                      key={`cell-${rowIndex}-${slot.getTime()}`}
                      slot={slot}
                      rowIndex={rowIndex}
                      currentTime={currentTime}
                      onCellClick={handleCellClick}
                      SLOT_WIDTH={SLOT_WIDTH}
                    />
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="timeline-info">
        <span>Timeline: {timelineInfo}</span>
        <span> | Click anywhere to jump to that time</span>
      </div>
    </div>
  );
};

// Usage example
const Timeline = () => {
  const now = new Date();
  const scheduleData = {
    start: new Date(now.getTime() - 30 * 60 * 1000), // 30 minutes ago
    end: new Date(now.getTime() + 90 * 60 * 1000), // 90 minutes from now
  };

  const handleTimeClick = (clickData) => {
    console.log("Jumped to:", clickData.formattedTime);
  };

  return (
    <div className="app">
      <TimeSchedule
        start={scheduleData.start}
        end={scheduleData.end}
        startTime={now}
        onCellClick={handleTimeClick}
      />
    </div>
  );
};

export default Timeline;
