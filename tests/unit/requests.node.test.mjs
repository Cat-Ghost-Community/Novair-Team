import { test } from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { requestSchema, requestListSchema, requestCategories, requestStatuses } from "../../src/shared/request-contracts.ts";
const body=()=>({operationKey:randomUUID(),title:"  یک عنوان روشن  ",category:"WEBSITE",description:"توضیحاتی روشن و کافی دربارهٔ امکانات موردنیاز برای این پروژه."});
test("request contracts normalize optional fields and text deterministically",()=>{const data=requestSchema.parse(body());assert.equal(data.title,"یک عنوان روشن");assert.equal(data.relevantUrl,null);assert.equal(data.budgetPreference,"UNDECIDED");assert.deepEqual(requestSchema.parse(data),data);});
test("request contracts reject mass assignment and unrecognized categories",()=>{for(const extra of [{ownerId:"someone"},{status:"ACCEPTED"},{category:"invented"}])assert.equal(requestSchema.safeParse({...body(),...extra}).success,false);assert.equal(Object.keys(requestCategories).length,9);});
test("request list pagination cannot request unbounded or negative offsets",()=>{assert.equal(requestListSchema.parse({}).page,1);for(const page of ["0","-1","1001","1e2","1.5"])assert.equal(requestListSchema.safeParse({page}).success,false);assert.equal(requestListSchema.safeParse({ownerId:"other"}).success,false);});
test("request status display retains the existing review domain and excludes project execution states",()=>{assert.deepEqual(Object.keys(requestStatuses),["NEW","REVIEWING","ACCEPTED","DECLINED","CANCELLED"]);assert(!Object.hasOwn(requestStatuses,"IN_PROGRESS"));});
