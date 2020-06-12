import { Injectable } from '@angular/core';
import { HttpClient, HttpEventType } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class AppService {
  newImage: any;
  constructor(private http: HttpClient) { }
  fileUploadProgress: string = null;
  onSubmit(fileData) {
    const formData = new FormData();
    formData.append('image', fileData);
     
    this.fileUploadProgress = '0%';
 
    return this.http.post('/api/mask_detector', formData, {
    });
}

}