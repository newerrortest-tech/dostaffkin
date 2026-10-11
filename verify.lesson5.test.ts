import '@angular/compiler';
import {describe,it,expect,vi,beforeEach} from 'vitest';
import {FormBuilder} from '@angular/forms';
import {Order} from './src/app/pages/order/order';
import {Track} from './src/app/pages/track/track';
let km = 1769.85;
class FakeRoute {
 handlers: Record<string,Function> = {};
 model = {events:{add:(name:string,fn:Function) => this.handlers[name] = fn}};
 getActiveRoute() {return {properties:{get:() => ({value:km * 1000})}};}
}
let routes:FakeRoute[];
beforeEach(() => {
 routes=[];
 vi.stubGlobal('alert',vi.fn());
 vi.stubGlobal('ymaps',{ready:(fn:Function)=>fn(),Map:class {geoObjects={add:vi.fn(),remove:vi.fn()};destroy=vi.fn();},SuggestView:class {events={add:vi.fn()};destroy=vi.fn();},multiRouter:{MultiRoute:class extends FakeRoute {constructor(...args:any[]){super();routes.push(this);}}}});
});
function order() {const o = new Order(new FormBuilder());o.ngOnInit();o.routeForm.patchValue({from:'Ростов-на-Дону',to:'Гатчина',size:'max'});return o;}
describe('lesson 5 behavior',() => {
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
 it('blocks submission without calculation or required contacts, then shows demo id',() => {
  const o=order();o.submitOrder();expect(alert).toHaveBeenCalled();expect(o.orderId()).toBeNull();
  o.calculate();routes.at(-1)!.handlers['requestsuccess']();o.submitOrder();expect(o.orderId()).toBeNull();
  o.orderForm.patchValue({name:'Учебный клиент',phone:'+70000000000'});
  const log=vi.spyOn(console,'log').mockImplementation(()=>{});o.submitOrder();expect(o.orderId()).toBe(1);log.mockRestore();o.ngOnDestroy();
 });
 it('validates tracking and renders the six demo statuses from lesson notes',() => {
  const t=new Track();t.trackShipment();expect(alert).toHaveBeenCalled();
  for(const value of ['abc','0','-1']) {t.trackNumber=value;t.trackShipment();expect(t.trackResult()).toBeNull();}
  t.trackNumber=' 1 ';t.trackShipment();expect(t.trackResult().statuses).toHaveLength(6);expect(t.trackResult().route.to).toContain('Минск');
 });
});
