/*
 * SPDX-License-Identifier: Apache-2.0
 */

'use strict';

const { Contract } = require('fabric-contract-api');

async function getCollectionName(ctx) {
    const mspid = ctx.clientIdentity.getMSPID();
    const collectionName = `_implicit_org_${mspid}`;
    return collectionName;
}

class PrivatedataContract extends Contract {

    async privatedataExists(ctx, studentId) {
        const collectionName = await getCollectionName(ctx);
        const data = await ctx.stub.getPrivateDataHash(collectionName, studentId);
        return (!!data && data.length > 0);
    }

    async labchaincodeExists(ctx, studentId) {
        const buffer = await ctx.stub.getState(studentId);
        return (!!buffer && buffer.length > 0);
    }

    async readStudentData(ctx, studentId) {
        const exists = await this.labchaincodeExists(ctx, studentId);
        if (!exists) {
            throw new Error(`The labchaincode ${studentId} does not exist`);
        }
        const buffer = await ctx.stub.getState(studentId);
        const asset = JSON.parse(buffer.toString());
        return asset;
    }

    async createStudent(ctx, studentId, birthYear, passed) {
        const exists = await this.labchaincodeExists(ctx, studentId);
        const privateExists = await this.privatedataExists(ctx, studentId);

        if (exists) {
            throw new Error(`The labchaincode ${studentId} already exists`);
        }

        if (privateExists) {
            throw new Error(`The asset privatedata ${studentId} already exists`);
        }

        const collectionName = await getCollectionName(ctx);
        if (collectionName == "_implicit_org_Org1MSP") {
            const privateAsset = {};

            const transientData = ctx.stub.getTransient();
            if (transientData.size === 0 || !transientData.has('name')) {
                throw new Error('The privateValue key was not specified in transient data. Please try again.');
            }
            privateAsset.privateValue = transientData.get('name').toString();

            const asset = { studentId, birthYear, passed };
            const buffer = Buffer.from(JSON.stringify(asset));
            await ctx.stub.putState(studentId, buffer);

            await ctx.stub.putPrivateData(collectionName, studentId, Buffer.from(JSON.stringify(privateAsset)));
        }
    }

    async updatePassedState(ctx, studentId, isPassed) {
        const exists = await this.labchaincodeExists(ctx, studentId);
        if (!exists) {
            throw new Error(`The labchaincode ${studentId} does not exist`);
        }

        const collectionName = await getCollectionName(ctx);
        if (collectionName == "_implicit_org_Org1MSP") {
            const buffer = await ctx.stub.getState(studentId);
            const asset = JSON.parse(buffer.toString());
            asset.passed = isPassed;
            const bufferWrite = Buffer.from(JSON.stringify(asset));
            await ctx.stub.putState(studentId, bufferWrite);
        }
    }
}

module.exports = PrivatedataContract;
