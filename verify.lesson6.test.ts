import {of, throwError} from 'rxjs';
import {DeliveryApi} from './src/app/services/delivery-api';
import '@angular/compiler';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {FormBuilder} from '@angular/forms';
import {Order} from './src/app/pages/order/order';
import {Track} from './src/app/pages/track/track';
const api = {createDelivery:vi.fn(() => of({id:42})),getDeliveryInfo:vi.fn(() => of({id:42,route:{from:'Ростов',to:'Москва'},statuses:[]}))};
let km = 1769.85;
class FakeRoute {
 handlers: Record<string,Function> = {};
 model = {events:{add:(name:string,fn:Function) => this.handlers[name] = fn}};
 getActiveRoute() {return {properties:{get:() => ({value:km * 1000})}};}
}
let routes:FakeRoute[];
beforeEach(() => {
 routes=[];
 api.createDelivery.mockReturnValue(of({id:42}));
 api.getDeliveryInfo.mockReturnValue(of({id:42,route:{from:'Ростов',to:'Москва'},statuses:[]}));
 api.createDelivery.mockClear();api.getDeliveryInfo.mockClear();
 vi.stubGlobal('alert',vi.fn());
 vi.stubGlobal('ymaps',{ready:(fn:Function)=>fn(),Map:class {geoObjects={add:vi.fn(),remove:vi.fn()};destroy=vi.fn();},SuggestView:class {events={add:vi.fn()};destroy=vi.fn();},multiRouter:{MultiRoute:class extends FakeRoute {constructor(...args:any[]){super();routes.push(this);}}}});
});
function order() {const o = new Order(new FormBuilder(), api as any);o.ngOnInit();o.routeForm.patchValue({from:'Ростов-на-Дону',to:'Гатчина',size:'max'});return o;}
describe('lesson 6 behavior',() => {
 it('calculates both speeds, rounds up and resets both size and speed changes',() => {
  const o = order();o.calculate();routes.at(-1)!.handlers['requestsuccess']();
  expect(o.calculationResult()).toMatchObject({total:123890,duration:24,rate:70});
  o.selectSpeed('fast');expect(o.calculationResult()).toBeNull();
  o.calculate();routes.at(-1)!.handlers['requestsuccess']();
  expect(o.calculationResult()).toMatchObject({total:142474,duration:17,speed:'fast'});
  o.selectSize('xs');expect(o.calculationResult()).toBeNull();o.ngOnDestroy();
 });
 it('preserves minimum price and rejects stale route callbacks',() => {
  km=0;const o=order();o.selectSize('xs');o.calculate();const stale=routes.at(-1)!;
  o.selectSpeed('fast');stale.handlers['requestsuccess']();expect(o.calculationResult()).toBeNull();
  o.calculate();routes.at(-1)!.handlers['requestsuccess']();expect(o.calculationResult()).toMatchObject({total:172,duration:1});o.ngOnDestroy();km=1769.85;
 });
 it('blocks submission without calculation or required contacts, then shows server id',() => {
  const o=order();o.submitOrder();expect(alert).toHaveBeenCalled();expect(o.orderId()).toBeNull();
  o.calculate();routes.at(-1)!.handlers['requestsuccess']();o.submitOrder();expect(o.orderId()).toBeNull();
  o.orderForm.patchValue({name:'Учебный клиент',phone:'+70000000000'});
  o.submitOrder();expect(o.orderId()).toBe(42);expect(api.createDelivery).toHaveBeenCalledWith(expect.objectContaining({customer:{name:'Учебный клиент',phone:'+70000000000',comment:''}}));o.ngOnDestroy();
 });
 it('validates tracking and uses server tracking data',() => {
  const t=new Track(api as any);t.trackShipment();expect(alert).toHaveBeenCalled();
  for(const value of ['abc','0','-1']) {t.trackNumber=value;t.trackShipment();expect(t.trackResult()).toBeNull();}
  t.trackNumber=' 1 ';t.trackShipment();expect(api.getDeliveryInfo).toHaveBeenCalledWith(1);expect(t.trackResult().route.to).toBe('Москва');
 });
});

describe('API errors', () => {
 it('uses the lesson endpoints and converts HTTP failures into errors', () => {
  const http = {post:vi.fn(() => of({id:72})),get:vi.fn(() => throwError(() => ({error:{error:'Не найдено'}})))};
  const service = new DeliveryApi(http as any);
  service.createDelivery({test:true}).subscribe(value => expect(value.id).toBe(72));
  expect(http.post).toHaveBeenCalledWith('https://testologia.ru/delivery/create',{test:true});
  service.getDeliveryInfo(72).subscribe(value => expect(value.error).toBe('Не найдено'));
  expect(http.get).toHaveBeenCalledWith('https://testologia.ru/delivery/info',{params:{id:72}});
 });
 it('does not show a success result when the API rejects creation or tracking', () => {
  const failing = {createDelivery:() => of({error:'Ошибка заявки'}),getDeliveryInfo:() => of({error:'Нет отправления'})};
  const o = new Order(new FormBuilder(), failing as any);
  o.calculationResult.set({total:149});o.orderForm.patchValue({name:'Тест',phone:'123'});o.submitOrder();
  expect(o.orderId()).toBeNull();expect(alert).toHaveBeenCalledWith('Ошибка заявки');
  const t = new Track(failing as any);t.trackNumber='72';t.trackShipment();
  expect(t.trackResult()).toBeNull();expect(alert).toHaveBeenCalledWith('Нет отправления');
 });
});
