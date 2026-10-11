import {Component, OnInit, OnDestroy, signal} from '@angular/core';
import {UpperCasePipe} from '@angular/common';
import {FormBuilder, FormGroup, ReactiveFormsModule, Validators} from '@angular/forms';
import {Subscription} from 'rxjs';
import {DELIVERY_SIZES, DELIVERY_SPEEDS} from '../../config/delivery-options';
declare var ymaps: any;
@Component({selector:'app-order', imports:[ReactiveFormsModule, UpperCasePipe], templateUrl:'./order.html', styleUrl:'./order.css'})
export class Order implements OnInit, OnDestroy {
 public readonly sizes = DELIVERY_SIZES;
 public readonly speeds = DELIVERY_SPEEDS;
 public map: any;
 private mapRoute: any;
 public routeForm: FormGroup;
 public orderForm: FormGroup;
 public orderId: any = signal(null);
 public calculationResult: any = signal(null);
 private formSubscription?: Subscription;
 private suggestions: any[] = [];
 private disposed = false;
 constructor(private formBuilder: FormBuilder) {
  this.routeForm = this.formBuilder.group({from:['',Validators.required],to:['',Validators.required],size:['xs',Validators.required],speed:['regular',Validators.required]});
  this.orderForm = this.formBuilder.group({name:['',Validators.required],phone:['',Validators.required],comment:['']});
 }
 ngOnInit() {
  this.formSubscription = this.routeForm.valueChanges.subscribe(() => {
   this.calculationResult.set(null);
   if (this.mapRoute) {this.map.geoObjects.remove(this.mapRoute);this.mapRoute = null;}
  });
  ymaps.ready(() => {
   if (this.disposed) return;
   this.map = new ymaps.Map('map', {center:[55.751244,37.618423],zoom:5,controls:['zoomControl']});
   this.suggestions = ['from','to'].map(field => {
    const suggest = new ymaps.SuggestView(field);
    suggest.events.add('select',(event:any) => this.routeForm.controls[field].setValue(event.get('item')?.value ?? ''));
    return suggest;
   });
  });
 }
 public selectSize(size:string) {this.routeForm.controls['size'].setValue(size);}
 public selectSpeed(speed:string) {this.routeForm.controls['speed'].setValue(speed);}
 public calculate() {
  this.calculationResult.set(null);
  if (!this.map || this.routeForm.invalid) return;
  const {from,to,size,speed} = this.routeForm.getRawValue();
  if (this.mapRoute) {this.map.geoObjects.remove(this.mapRoute);this.mapRoute = null;}
  this.mapRoute = new ymaps.multiRouter.MultiRoute({referencePoints:[from,to]},{boundsAutoApply:false});
  const route = this.mapRoute;
  this.map.geoObjects.add(route);
  route.model.events.add('requestsuccess',() => {
   if (this.disposed || this.mapRoute !== route) return;
   try {
    const activeRoute = route.getActiveRoute();
    if (!activeRoute) return this.failedCalculation();
    const km = activeRoute.properties.get('distance').value / 1000;
    const sizeValue = size ?? '';
    const sizeConfig = this.sizes.find(item => item.value === sizeValue);
    if (!sizeConfig) return this.failedCalculation();
    let total = Math.max(sizeConfig.min,Math.ceil(km * sizeConfig.rate));
    let duration = Math.min(30,1 + Math.ceil(km / 80));
    if (speed === 'fast') {total = Math.ceil(total * 1.15);duration = Math.ceil(duration - duration * 0.30);}
    this.calculationResult.set({from,to,size,distance:km.toFixed(1),duration,rate:sizeConfig.rate,total,speed});
   } catch (err) {this.failedCalculation();}
  });
  route.model.events.add('requestfail',() => {if (!this.disposed && this.mapRoute === route) this.failedCalculation();});
 }
 private failedCalculation() {
  this.calculationResult.set(null);
  alert('Не удалось построить маршрут. Проверьте адреса и выбранные параметры.');
 }
 public submitOrder() {
  const calculation = this.calculationResult();
  if (!calculation) {alert('Сначала рассчитайте стоимость, чтобы оформить заявку');return;}
  if (this.orderForm.invalid) {alert('Введите имя и корректный телефон');return;}
  const {name,phone,comment} = this.orderForm.getRawValue();
  const trimmedName = (name ?? '').trim();
  const trimmedPhone = (phone ?? '').trim();
  const trimmedComment = (comment ?? '').trim();
  const payload = {customer:{name:trimmedName,phone:trimmedPhone,comment:trimmedComment},calculation,createdAt:new Date().toISOString()};
  console.log(payload);
  this.orderId.set(1);
 }
 ngOnDestroy() {
  this.disposed = true;
  this.formSubscription?.unsubscribe();
  this.suggestions.forEach(suggest => suggest.destroy());
  this.map?.destroy();
 }
}
