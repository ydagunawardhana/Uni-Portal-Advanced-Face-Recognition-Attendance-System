import { Calendar, Clock, MapPin, User } from 'lucide-react';

interface ClassSession {
  id: number;
  subject: string;
  time: string;
  duration: string;
  lecturer: string;
  hall: string;
  color: string;
}

interface DaySchedule {
  day: string;
  date: string;
  classes: ClassSession[];
}

export default function StudentTimetable() {
  // Get current day
  const currentDay = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  // Mock timetable data
  const timetable: DaySchedule[] = [
    {
      day: 'Monday',
      date: 'Feb 10',
      classes: [
        {
          id: 1,
          subject: 'Database Systems',
          time: '09:00 AM',
          duration: '2 hours',
          lecturer: 'Dr. Sarah Johnson',
          hall: 'Hall A-101',
          color: 'bg-blue-500',
        },
        {
          id: 2,
          subject: 'Data Structures',
          time: '01:00 PM',
          duration: '1.5 hours',
          lecturer: 'Prof. Michael Chen',
          hall: 'Hall B-204',
          color: 'bg-purple-500',
        },
      ],
    },
    {
      day: 'Tuesday',
      date: 'Feb 11',
      classes: [
        {
          id: 3,
          subject: 'Operating Systems',
          time: '10:00 AM',
          duration: '2 hours',
          lecturer: 'Dr. Emily Brown',
          hall: 'Hall C-301',
          color: 'bg-green-500',
        },
        {
          id: 4,
          subject: 'Web Development',
          time: '02:30 PM',
          duration: '2 hours',
          lecturer: 'Prof. James Wilson',
          hall: 'Lab D-102',
          color: 'bg-orange-500',
        },
      ],
    },
    {
      day: 'Wednesday',
      date: 'Feb 12',
      classes: [
        {
          id: 5,
          subject: 'Database Systems',
          time: '09:00 AM',
          duration: '2 hours',
          lecturer: 'Dr. Sarah Johnson',
          hall: 'Hall A-101',
          color: 'bg-blue-500',
        },
        {
          id: 6,
          subject: 'Computer Networks',
          time: '11:30 AM',
          duration: '1.5 hours',
          lecturer: 'Dr. Robert Martinez',
          hall: 'Hall B-203',
          color: 'bg-pink-500',
        },
        {
          id: 7,
          subject: 'Software Engineering',
          time: '02:00 PM',
          duration: '2 hours',
          lecturer: 'Prof. Linda Davis',
          hall: 'Hall A-105',
          color: 'bg-indigo-500',
        },
      ],
    },
    {
      day: 'Thursday',
      date: 'Feb 13',
      classes: [
        {
          id: 8,
          subject: 'Data Structures',
          time: '10:00 AM',
          duration: '2 hours',
          lecturer: 'Prof. Michael Chen',
          hall: 'Hall B-204',
          color: 'bg-purple-500',
        },
        {
          id: 9,
          subject: 'Operating Systems',
          time: '01:00 PM',
          duration: '1.5 hours',
          lecturer: 'Dr. Emily Brown',
          hall: 'Hall C-301',
          color: 'bg-green-500',
        },
      ],
    },
    {
      day: 'Friday',
      date: 'Feb 14',
      classes: [
        {
          id: 10,
          subject: 'Web Development',
          time: '09:30 AM',
          duration: '2 hours',
          lecturer: 'Prof. James Wilson',
          hall: 'Lab D-102',
          color: 'bg-orange-500',
        },
        {
          id: 11,
          subject: 'Computer Networks',
          time: '12:00 PM',
          duration: '2 hours',
          lecturer: 'Dr. Robert Martinez',
          hall: 'Hall B-203',
          color: 'bg-pink-500',
        },
      ],
    },
  ];

  return (
    <div className="p-8 bg-white">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Calendar className="w-8 h-8 text-red-600" />
          <h1 className="text-3xl font-bold text-gray-900">Weekly Class Schedule</h1>
        </div>
        <p className="text-gray-600">View your complete weekly timetable and class details</p>
      </div>

      {/* Weekly Calendar Grid */}
      <div className="grid grid-cols-5 gap-4">
        {timetable.map((daySchedule) => {
          const isCurrentDay = daySchedule.day === currentDay;
          
          return (
            <div
              key={daySchedule.day}
              className={`rounded-lg overflow-hidden transition-all ${
                isCurrentDay
                  ? 'ring-4 ring-red-500 shadow-xl bg-red-50'
                  : 'border border-gray-200 bg-white'
              }`}
            >
              {/* Day Header */}
              <div
                className={`p-4 text-center ${
                  isCurrentDay
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 text-gray-900'
                }`}
              >
                <h3 className="font-bold text-lg">{daySchedule.day}</h3>
                <p className={`text-sm ${isCurrentDay ? 'text-red-100' : 'text-gray-600'}`}>
                  {daySchedule.date}
                </p>
                {isCurrentDay && (
                  <span className="inline-block mt-1 px-2 py-0.5 bg-white text-red-600 text-xs font-bold rounded-full">
                    TODAY
                  </span>
                )}
              </div>

              {/* Classes for the day */}
              <div className="p-3 space-y-3 min-h-[500px]">
                {daySchedule.classes.length > 0 ? (
                  daySchedule.classes.map((classSession) => (
                    <div
                      key={classSession.id}
                      className={`${classSession.color} rounded-lg p-4 text-white shadow-md hover:shadow-lg transition-all transform hover:scale-105`}
                    >
                      {/* Subject Name */}
                      <h4 className="font-bold text-sm mb-2 leading-tight">
                        {classSession.subject}
                      </h4>

                      {/* Time */}
                      <div className="flex items-center gap-1.5 mb-2 text-xs">
                        <Clock className="w-3.5 h-3.5" />
                        <span>{classSession.time}</span>
                        <span className="opacity-75">({classSession.duration})</span>
                      </div>

                      {/* Lecture Hall */}
                      <div className="flex items-center gap-1.5 mb-1.5 text-xs">
                        <MapPin className="w-3.5 h-3.5" />
                        <span>{classSession.hall}</span>
                      </div>

                      {/* Lecturer */}
                      <div className="flex items-center gap-1.5 text-xs">
                        <User className="w-3.5 h-3.5" />
                        <span>{classSession.lecturer}</span>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                    No classes
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-8 max-w-4xl mx-auto">
        <div className="bg-gray-50 rounded-lg border border-gray-200 p-6">
          <h3 className="font-bold text-gray-900 mb-4">Subject Color Code</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-blue-500 rounded"></div>
              <span className="text-sm text-gray-700">Database Systems</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-purple-500 rounded"></div>
              <span className="text-sm text-gray-700">Data Structures</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-green-500 rounded"></div>
              <span className="text-sm text-gray-700">Operating Systems</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-orange-500 rounded"></div>
              <span className="text-sm text-gray-700">Web Development</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-pink-500 rounded"></div>
              <span className="text-sm text-gray-700">Computer Networks</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 bg-indigo-500 rounded"></div>
              <span className="text-sm text-gray-700">Software Engineering</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
