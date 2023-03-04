import React from "react";

function FileUpload({ onFileUploaded }) {
  function handleFileChange(event) {
    const file = event.target.files[0];

    if (!file){
        return;
    }

    onFileUploaded(file);
  }

  return (
    <div>
      <p>Upload a file with your script</p>
      <input type="file" onChange={handleFileChange} />
    </div>
  );
}

export default FileUpload;