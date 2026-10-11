import {DeliveryApi} from '../../services/delivery-api';
import {Component, signal} from '@angular/core';
import {FormsModule} from '@angular/forms';
@Component({selector:'app-track',imports:[FormsModule],templateUrl:'./track.html',styleUrl:'./track.css'})
export class Track {
 constructor(private deliveryApi: DeliveryApi) {}
 trackNumber = '';
 trackResult: any = signal(null);
 trackShipment():void {
  const rawValue = this.trackNumber.trim();
  if (!rawValue) {alert('Заполните номер отправления');return;}
  this.trackResult.set(null);
  const numericValue = Number(rawValue);
  if (Number.isNaN(numericValue) || numericValue <= 0) {alert('Введите корректный номер отправления');return;}
  this.deliveryApi.getDeliveryInfo(numericValue).subscribe(response => {
   if ('error' in response) {alert(response.error);return;}
   this.trackResult.set(response);
  });
 }
}
