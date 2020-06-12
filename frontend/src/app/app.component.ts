import { Component, ElementRef, OnInit, Renderer2, ViewChild } from '@angular/core';
import { faCameraRetro } from '@fortawesome/free-solid-svg-icons';
import { AppService } from './app.service';
import { HttpClient, HttpEventType } from '@angular/common/http';
import {ɵBROWSER_SANITIZATION_PROVIDERS, DomSanitizer} from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  providers: [ɵBROWSER_SANITIZATION_PROVIDERS],
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  @ViewChild('video', { static: true }) videoElement: ElementRef;
  @ViewChild('canvas', { static: true }) canvas: ElementRef;
  title = 'hackathonClient';
  filmIcon = faCameraRetro;
  public imagePath;
  imgURL: any;
  showCamSection: boolean;
  imageData:any;
  newImgURL: any;
  public message: string;
  fileData: File = null;
  previewUrl:any = null;
  fileUploadProgress: string = null;
  uploadedFilePath: string = null;
  responseData: any;
  videoWidth = 0;
  videoHeight = 0;
  isDataAvailable: boolean = false;
  no_people: number;
  no_people_with_mask: number;
  no_people_without_mask: number;
  capturedImg :any;
  constraints = {
    video: {
      facingMode: "environment",
      width: { ideal: 2000 },
      height: { ideal: 2000 }
    }
  };
  constructor(private appService: AppService,
              private http: HttpClient,
              private sanitizer: DomSanitizer,
              private renderer: Renderer2) { }

  ngOnInit() {
    this.showCamSection =true;
  }
  preview() {
    // Show preview 
    var mimeType = this.fileData.type;
    if (mimeType.match(/image\/*/) == null) {
      return;
    }
 
    var reader = new FileReader();      
    reader.readAsDataURL(this.fileData); 
    reader.onload = (_event) => { 
      this.previewUrl = reader.result; 
    }
  }

  startCamera() {
    this.showCamSection =true;
    this.isDataAvailable= false;
    if (!!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
      navigator.mediaDevices.getUserMedia(this.constraints).then(
        this.attachVideo.bind(this)
        ).catch(this.handleError);
    } else {
      alert('Sorry, camera not available.');
    }
  }

  fileProgress(fileInput: any) {
    this.showCamSection =false;
    this.newImgURL = null;
    this.isDataAvailable = false;
    this.fileData = <File>fileInput.target.files[0];
    this.fileUploadProgress = this.fileData.name;
    this.preview();
    this.showImage(this.fileData);
    }

  showImage(files) {
    if (files.length === 0)
      return;

    var mimeType = files.type;
    if (mimeType.match(/image\/*/) == null) {
      this.message = "Only images are supported.";
      return;
    }

    var reader = new FileReader();
    this.imagePath = files;
    reader.readAsDataURL(files); 
    reader.onload = (_event) => { 
      this.imgURL = reader.result; 
    }
  }
  processImage() {
    const formData = new FormData();
    formData.append('image', this.fileData);
    this.http.post('/api/mask_detector',formData).subscribe(
      (val: any) => {
        this.responseData = val;
      },
      response => {
        console.log('error', response);
      },
      () => {
        this.isDataAvailable = true;
        this.no_people = this.responseData.no_people;
        this.no_people_with_mask = this.responseData.no_people_with_mask;
        this.no_people_without_mask = this.responseData.no_people_without_mask;
        this.getImage(this.responseData.image_path)
      });
  }
  getImage(imagepath){
    const formData = new FormData();
    formData.append('path', imagepath);
    this.http.post(`/api/get_image`,
    formData,
    { 
    //   params: {
    //   path: imagepath
    // },
   responseType: 'blob'}).subscribe(
      (value : any)=>{
        const reader = new FileReader();
        reader.readAsDataURL(value);
        reader.onload = (_event) => { 
          this.newImgURL = reader.result; 
        }
        
        console.log(this.newImgURL);
      },
      response => {
        console.log('error', response);
      },
      () => {
        console.log('completed.');
      });
  }

  capture() {
    this.renderer.setProperty(this.canvas.nativeElement, 'width', this.videoWidth);
    this.renderer.setProperty(this.canvas.nativeElement, 'height', this.videoHeight);
    this.canvas.nativeElement.getContext('2d').drawImage(this.videoElement.nativeElement, 0, 0);
    const canvas = this.canvas.nativeElement.getContext('2d');
   // const img2 = this.canvas.nativeElement.getContext('2d').clearRect(0, 0, this.canvas.nativeElement.width, this.canvas.nativeElement.height);
    //console.log(img2)
    this.capturedImg= this.canvas.nativeElement.toDataURL("image/png")
  }
  convertCanvasToImage(canvas) {
    var image = new Image();
    image.src = canvas.gettoDataURL("image/png");
    return image;
  }
  stopCamera() {
    this.videoElement.nativeElement.pause();
    this.videoElement.nativeElement.src = "";
    this.videoElement.nativeElement.srcObject = null;
    
    // As per new API stop all streams
    if (this.videoElement.nativeElement.localStream) {
    this.videoElement.nativeElement.localStream.getTracks().forEach(track => track.stop());
    }
    this.showCamSection=false;
  }
  
  attachVideo(stream) {
    this.renderer.setProperty(this.videoElement.nativeElement, 'srcObject', stream);
    this.renderer.listen(this.videoElement.nativeElement, 'play', (event) => {
      this.videoHeight = this.videoElement.nativeElement.videoHeight;
      this.videoWidth = this.videoElement.nativeElement.videoWidth;
    });
  }
  handleError(error) {
    console.log('Error: ', error);
  }
}
