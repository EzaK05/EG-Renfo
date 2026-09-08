import { Route, Routes } from "react-router-dom";
import { RequireAuth } from "./auth/RequireAuth";
import { Landing } from "./pages/Landing";
import { StaffApp } from "./pages/staff/StaffApp";
import { StaffLogin } from "./pages/staff/StaffLogin";
import { StudentApp } from "./pages/student/StudentApp";
import { StudentLogin } from "./pages/student/StudentLogin";
import { TutorApp } from "./pages/tutor/TutorApp";
import { TutorLogin } from "./pages/tutor/TutorLogin";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/equipe/connexion" element={<StaffLogin />} />
      <Route
        path="/equipe"
        element={
          <RequireAuth kind="staff" redirectTo="/equipe/connexion">
            <StaffApp />
          </RequireAuth>
        }
      />

      <Route path="/eleve/connexion" element={<StudentLogin />} />
      <Route
        path="/eleve"
        element={
          <RequireAuth kind="student" redirectTo="/eleve/connexion">
            <StudentApp />
          </RequireAuth>
        }
      />

      <Route path="/encadreur/connexion" element={<TutorLogin />} />
      <Route
        path="/encadreur"
        element={
          <RequireAuth kind="tutor" redirectTo="/encadreur/connexion">
            <TutorApp />
          </RequireAuth>
        }
      />
    </Routes>
  );
}
