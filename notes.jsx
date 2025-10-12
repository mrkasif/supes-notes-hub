import React, { useState, useMemo } from 'react';
import { BookOpen, Folder, FileText, Calendar, Menu, ArrowLeft, X } from 'lucide-react';

// --- MOCK DATA ---
// This structure holds the data for 3 years, each with 2 semesters.
const NOTES_DATA = [
  // --- YEAR 1 ---
  {
    year: 1,
    semester: 1,
    subjects: [
      { title: "Operating Systems", code: "CS101", professor: "Prof. Mr. Bhushan kulkarni", notesCount: 3, content: "Introduction to operating system" },
      { title: "Mathematical Foundation", code: "MATH102", professor: "Prof. Ms. Shruti", notesCount: 2, content: "Sets,Matrices" },
      { title: "Communication Skills", code: "ENG104", professor: "Prof. Ms. -------", notesCount: 1, content: "Essay writing fundamentals: structure, thesis development, and argumentation. Remember to cite sources properly using MLA format." },
      { title: "C Programming", code: "C105", professor: "Ms. Pranita Wagh", notesCount: 4, content: "C Basics,Loops,Variables" },
      { title: "Computer Fundamentals", code: "CF106", professor: "Mr. Laxman Tour", notesCount: 4, content: "Proceccer,Input output devices" },
      { title: "Writing Skills", code: "WS107", professor: "Mr. --------", notesCount: 4, content: "----------" },
      { title: "Hindi", code: "CF108", professor: "Ms. Geeta anjali", notesCount: 4, content: "Sant kabir" },
    ],
  },
  {
    year: 1,
    semester: 2,
    subjects: [
      { title: "Data Structures & Algorithms", code: "CS109", professor: "Ms. Rupali moharkar", notesCount: 5, content: "Notes on linked lists, stacks, queues, and Big O notation for complexity analysis. Priority queues and heaps were covered last week." },
      { title: "ALP 8086", code: "MATH110", professor: "Prof. Mr. Bhushan Kulkarni", notesCount: 3, content: "------" },
      { title: "Communication Skills", code: "ENG111", professor: "Prof. Ms. -------", notesCount: 1, content: "Essay writing fundamentals: structure, thesis development, and argumentation. Remember to cite sources properly using MLA format." },
      { title: "C Programming Advance", code: "C112", professor: "Ms. Pranita Wagh", notesCount: 4, content: "Loops,Variables" },
      { title: "DBMS", code: "DB113", professor: "Ms. Shruti", notesCount: 4, content: "database management" },
      { title: "Constitution", code: "WS114", professor: "Mr. --------", notesCount: 4, content: "----------" },
    ],
  },
  // --- YEAR 2 ---
  {
    year: 2,
    semester: 1,
    subjects: [
      { title: "ERP", code: "CS201", professor: "Ms. Rupali Moharkar", notesCount: 7, content: "----------" },
      { title: "C++", code: "CS202", professor: "Ms. Seema Navlei", notesCount: 3, content: "---------" },
      { title: "Statistical Method", code: "MATH201", professor: "Mr. Bhushan Kulkarni", notesCount: 4, content: "Introduction to probability distributions (Binomial, Poisson), hypothesis testing, and regression analysis. Study the central limit theorem." },
      { title: "Web Developement", code: "WB201", professor: "Ms. Seema Navle", notesCount: 3, content: "---------" },
      { title: "Basics Of Android", code: "A201", professor: "Mr. Ajinkya Mashalkar", notesCount: 3, content: "---------" },
      { title: "English", code: "EN201", professor: "Ms. ---------", notesCount: 3, content: "---------" },
    ], 
  },
  {
    year: 2,
    semester: 2,
    subjects: [
    
    ],
  },
  // --- YEAR 3 ---
  {
    year: 3,
    semester: 1,
    subjects: [
  
    ],
  },
  {
    year: 3,
    semester: 2,
    subjects: [
    
    ],
  },
];

// --- UTILITY FUNCTION: Calculates total subjects/notes for a given year ---
const getYearSummary = (year) => {
  const yearData = NOTES_DATA.filter(d => d.year === year);
  const allSubjects = yearData.flatMap(d => d.subjects);
  const totalSubjects = allSubjects.length;
  const totalNotes = allSubjects.reduce((sum, subject) => sum + subject.notesCount, 0);

  return { totalSubjects, totalNotes };
};


// --- COMPONENTS ---

const YearTab = ({ year, isActive, onClick }) => {
  const { totalSubjects, totalNotes } = getYearSummary(year);

  const activeClasses = isActive
    ? "bg-white shadow-xl ring-2 ring-indigo-500 text-indigo-700 font-semibold"
    : "bg-gray-100 text-gray-600 hover:bg-gray-200";

  return (
    <button
      onClick={() => onClick(year)}
      className={`p-4 rounded-xl transition-all duration-300 transform hover:scale-[1.02] w-full md:w-48 lg:w-56 text-left ${activeClasses}`}
      aria-label={`Select Year ${year} - ${isActive ? 'Active' : 'Inactive'}`}
    >
      <div className="text-xl font-bold mb-1">Year {year}</div>
      <div className="text-sm space-y-1">
        <div className="flex justify-between">
          <span className="font-medium">Subjects</span>
          <span className="font-mono">{totalSubjects}</span>
        </div>
        <div className="flex justify-between">
          <span className="font-medium">Notes</span>
          <span className="font-mono">{totalNotes}</span>
        </div>
      </div>
      {isActive && (
        <span className="absolute top-2 right-2 px-2 py-0.5 text-xs font-bold bg-indigo-500 text-white rounded-full">Active</span>
      )}
    </button>
  );
};

const SemesterTab = ({ semester, isActive, onClick }) => {
  const activeClasses = isActive
    ? "bg-white shadow-md text-indigo-600 font-bold border-b-2 border-indigo-600"
    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50";

  return (
    <button
      onClick={() => onClick(semester)}
      className={`px-6 py-3 transition-all duration-200 rounded-t-lg ${activeClasses}`}
      aria-label={`Select Semester ${semester} - ${isActive ? 'Active' : 'Inactive'}`}
    >
      Semester {semester}
    </button>
  );
};

// Now accepts an onSelect function from the parent
const SubjectCard = ({ subject, onSelect }) => (
  <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 flex flex-col justify-between transition-all duration-300 hover:shadow-xl hover:border-indigo-200">
    <div>
      <div className="flex items-center mb-3">
        <BookOpen className="w-5 h-5 text-indigo-500 mr-2" />
        <h3 className="text-lg font-semibold text-gray-800">{subject.title}</h3>
      </div>
      <p className="text-sm text-indigo-500 font-medium mb-4 ml-7">{subject.code}</p>
      
      <p className="text-sm text-gray-500 ml-7 mb-4">
        {subject.professor}
      </p>
    </div>
    
    <div className="flex justify-between items-center pt-4 border-t border-gray-50">
      <div className="flex items-center text-sm text-gray-600">
        <FileText className="w-4 h-4 mr-2 text-blue-400" />
        <span className='font-mono'>{subject.notesCount} notes</span>
      </div>
      <button
        // UPDATED: Now calls the onSelect function to show the detail view
        onClick={() => onSelect(subject)}
        className="px-4 py-2 text-sm font-medium text-white bg-indigo-500 rounded-lg hover:bg-indigo-600 transition duration-150 shadow-md hover:shadow-lg"
        aria-label={`View notes for ${subject.title}`}
      >
        View Notes
      </button>
    </div>
  </div>
);

// NEW Component for showing notes detail
const NotesDetail = ({ subject, onBack }) => (
    <div className="p-6 bg-white rounded-xl shadow-2xl min-h-[70vh]">
        <header className="mb-6 pb-4 border-b border-gray-200 flex justify-between items-center">
            <button 
                onClick={onBack} 
                className="flex items-center text-indigo-600 hover:text-indigo-800 transition duration-150 p-2 rounded-lg bg-indigo-50 hover:bg-indigo-100"
                aria-label="Back to dashboard"
            >
                <ArrowLeft className="w-5 h-5 mr-2" />
                <span className="font-semibold text-sm">Back to Dashboard</span>
            </button>
            <h2 className="text-2xl font-extrabold text-gray-900 flex items-center ml-4">
                <FileText className="w-6 h-6 mr-3 text-blue-500" />
                {subject.title} Notes
            </h2>
            <div>{/* Spacer */}</div>
        </header>

        <div className="space-y-4">
            <div className="flex justify-between items-center bg-gray-50 p-4 rounded-lg border border-gray-100">
                <p className="text-sm text-gray-700 font-medium">Course Code: <span className="font-mono text-indigo-600 ml-1">{subject.code}</span></p>
                <p className="text-sm text-gray-700 font-medium">Professor: <span className="text-gray-800 ml-1">{subject.professor}</span></p>
                <p className="text-sm text-gray-700 font-medium">Total Notes Files: <span className="font-bold text-lg text-green-600 ml-1">{subject.notesCount}</span></p>
            </div>
            
            <div className="mt-8">
                <h3 className="text-xl font-bold text-gray-800 mb-3 border-b pb-2">Summary of Key Notes</h3>
                <div className="bg-blue-50 p-5 rounded-lg border-l-4 border-blue-400 text-gray-700">
                    <p className="leading-relaxed whitespace-pre-wrap">{subject.content}</p>
                </div>

                <div className="mt-6 text-center">
                    <button className="px-6 py-3 bg-green-500 text-white font-bold rounded-xl shadow-lg hover:bg-green-600 transition duration-200">
                        Download All {subject.notesCount} Files
                    </button>
                    <p className="text-xs text-gray-400 mt-2">Simulated action: actual download not implemented.</p>
                </div>
            </div>
        </div>
    </div>
);


// --- MAIN APP COMPONENT ---
export default function App() {
  const years = [1, 2, 3];
  const semesters = [1, 2];

  const [activeYear, setActiveYear] = useState(years[0]);
  const [activeSemester, setActiveSemester] = useState(semesters[0]);
  // NEW STATE: Holds the subject object to show the detail view, or null if on dashboard
  const [selectedSubject, setSelectedSubject] = useState(null);

  // Filter the data based on active year and semester
  const activeContent = useMemo(() => {
    const data = NOTES_DATA.find(d => d.year === activeYear && d.semester === activeSemester);
    return data ? data.subjects : [];
  }, [activeYear, activeSemester]);

  // If a subject is selected, render the detail view
  if (selectedSubject) {
    return (
        <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
            <NotesDetail 
                subject={selectedSubject} 
                onBack={() => setSelectedSubject(null)} // Function to reset and go back to dashboard
            />
            <footer className="text-center p-4 text-sm text-gray-400 border-t border-gray-200 mt-8">
                © 2024 College Notes Tracker. Built with React and Tailwind CSS.
            </footer>
        </div>
    );
  }

  // Otherwise, render the main dashboard
  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-8 font-sans">
      <header className="mb-8">
        <h1 className="text-3xl font-extrabold text-gray-900 flex items-center">
          <Folder className="w-7 h-7 mr-3 text-indigo-500" />
          College Notes Dashboard
        </h1>
        <p className="text-gray-500 mt-1">Organize your academic journey across all years and semesters.</p>
      </header>

      {/* 1. Year Selection Tabs */}
      <div className="mb-10 p-4 bg-white rounded-xl shadow-md">
        <h2 className="text-lg font-bold text-gray-700 mb-4">Academic Years</h2>
        <div className="flex flex-wrap gap-4 justify-start">
          {years.map((year) => (
            <div key={year} className="relative">
              <YearTab
                year={year}
                isActive={activeYear === year}
                onClick={setActiveYear}
              />
            </div>
          ))}
        </div>
      </div>

      {/* 2. Semester Selection Tabs */}
      <div className="mb-6 border-b border-gray-200">
        <div className="flex space-x-4 overflow-x-auto">
          {semesters.map((semester) => (
            <SemesterTab
              key={semester}
              semester={semester}
              isActive={activeSemester === semester}
              onClick={setActiveSemester}
            />
          ))}
        </div>
      </div>

      {/* 3. Subject Display Area */}
      <div className="mb-8">
        <div className="flex items-center text-lg font-semibold text-gray-700 mb-5">
          <Calendar className="w-5 h-5 mr-2 text-indigo-500" />
          <span>Year {activeYear} - Semester {activeSemester}</span>
          <span className="ml-4 px-3 py-1 text-sm font-medium bg-indigo-100 text-indigo-700 rounded-full">
            {activeContent.length} subjects
          </span>
        </div>

        {activeContent.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {activeContent.map((subject) => (
              <SubjectCard 
                key={subject.code} 
                subject={subject} 
                onSelect={setSelectedSubject} // Passed down the function
              />
            ))}
          </div>
        ) : (
          <div className="text-center p-12 bg-white rounded-xl shadow-md border border-gray-100">
            <Menu className="w-10 h-10 mx-auto text-gray-400 mb-3" />
            <p className="text-lg font-medium text-gray-600">No subjects scheduled for this semester yet.</p>
            <p className="text-sm text-gray-400 mt-1">Check back later or add new course details.</p>
          </div>
        )}
      </div>

      <footer className="text-center p-4 text-sm text-gray-400 border-t border-gray-200 mt-8">
        © 2024 College Notes Tracker. Built with React and Tailwind CSS.
      </footer>
    </div>
  );
}