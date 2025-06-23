# AWS Transcribe Setup Guide

## Environment Variables

Create a `.env.local` file in your project root with:

```bash
AWS_ACCESS_KEY_ID=your_aws_access_key_here
AWS_SECRET_ACCESS_KEY=your_aws_secret_key_here
AWS_REGION=us-east-1
```

## AWS IAM Permissions

Your AWS user needs the following permission:

- `transcribe:StartStreamTranscription`

## How to get AWS credentials:

1. Go to AWS Console → IAM → Users
2. Create a new user or select existing user
3. Attach policy with Transcribe permissions
4. Generate Access Keys
5. Add keys to `.env.local` file

## Real-time Transcription Features:

- ✅ Live transcription as you speak
- ✅ Auto-stops after 5 seconds of silence
- ✅ Voice activity detection
- ✅ Real-time display of partial and final results
- ✅ Uses AWS Transcribe Streaming API
