import { useState } from "react";
import ARViewer from "../components/ARViewer";

const App = () => {
  const [showAR, setShowAR] = useState(false);

  return (
    <div>
      <button
        type="button"
        onClick={() => setShowAR(true)}
      >
        VIEW IN MY SPACE
      </button>

      {showAR && (
        <ARViewer
          modelUrl="/models/Elevator_Master.glb"
        />
      )}
    </div>
  );
};

export default App;