import { getDriveAccessToken } from "./firebase";

export const uploadToDrive = async (file: File, options?: { isCourseMaterial?: boolean }): Promise<string | null> => {
  const token = await getDriveAccessToken();
  if (!token) return null;

  try {
    const isMaterial = options?.isCourseMaterial;
    const folderName = isMaterial ? '練習資料-課程' : '照片集-課程';
    
    // 1. Search for the folder
    let folderId = null;
    const searchRes = await fetch(`https://www.googleapis.com/drive/v3/files?q=mimeType='application/vnd.google-apps.folder' and name='${encodeURIComponent(folderName)}' and trashed=false&fields=files(id)`, {
      headers: { Authorization: `Bearer ${token}` }
    });
    const searchData = await searchRes.json();
    
    if (searchData.error) {
       console.error("Drive search error:", searchData.error);
       throw new Error(`搜尋資料夾失敗: ${searchData.error.message || JSON.stringify(searchData.error)}`);
    }

    if (searchData.files && searchData.files.length > 0) {
      folderId = searchData.files[0].id;
    } else {
      // 2. Create the folder if it doesn't exist
      const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: folderName,
          mimeType: 'application/vnd.google-apps.folder'
        })
      });
      const createData = await createRes.json();
      
      if (createData.error) {
         console.error("Drive create error:", createData.error);
         throw new Error(`建立資料夾失敗: ${createData.error.message || JSON.stringify(createData.error)}`);
      }
      folderId = createData.id;
    }

    if (!folderId) {
      throw new Error("Unable to create or find folder");
    }

    // 3. Upload the file to the folder via multipart upload (allows metadata + content)
    const metadata = {
      name: file.name,
      parents: [folderId]
    };

    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const uploadRes = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: form
    });
    
    const uploadData = await uploadRes.json();
    if (uploadData.error) {
       console.error("Drive upload error:", uploadData.error);
       throw new Error(`上傳檔案失敗: ${uploadData.error.message || JSON.stringify(uploadData.error)}`);
    }

    if (uploadData.id) {
       // Also need to adjust permissions to anyone with link can view so that students can see it!
       const permRes = await fetch(`https://www.googleapis.com/drive/v3/files/${uploadData.id}/permissions`, {
         method: 'POST',
         headers: {
           'Authorization': `Bearer ${token}`,
           'Content-Type': 'application/json'
         },
         body: JSON.stringify({
           role: 'reader',
           type: 'anyone'
         })
       });
       const permData = await permRes.json();
       if (permData.error) {
          console.error("Drive permission error:", permData.error);
       }

       if (isMaterial) {
         return uploadData.webViewLink;
       } else {
         return `https://drive.google.com/thumbnail?id=${uploadData.id}&sz=w2560`;
       }
    }

  } catch (error: any) {
    console.error("Upload to Drive error:", error);
    alert("上傳 Google Drive 失敗：\n\n" + (error.message || error));
    throw error;
  }
  return null;
}
