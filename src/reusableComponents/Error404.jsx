import React from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft, Home, SearchX } from "lucide-react";
import Layout from "../layout/Layout";
import Button from "../ui/Button";

const DIGIT =
  "text-[96px] sm:text-[140px] font-black leading-none tracking-tighter text-[#183C31]";

const Error404 = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <Layout
      navLeftSlot={
        <h1 className="min-w-0 truncate text-xs font-bold tracking-tight text-slate-800 sm:text-sm">
          Page not found
        </h1>
      }
    >
      <div className="flex min-h-[calc(100dvh-8rem)] items-center justify-center px-4 py-10">
        <div className="w-full max-w-xl text-center">
          {/* 404 with the zero replaced by a "not found" ring */}
          <div
            aria-hidden="true"
            className="flex select-none items-center justify-center gap-2 sm:gap-4  animate-bounce"
          >
            <span className={DIGIT}>4</span>

            <span className="flex h-[68px] w-[68px] items-center justify-center rounded-full border-[10px] border-[#183C31] bg-[#E7E2D5] sm:h-[100px] sm:w-[100px] sm:border-[14px]">
              <SearchX className="h-7 w-7 text-[#183C31] sm:h-10 sm:w-10" />
            </span>

            <span className={DIGIT}>4</span>
          </div>

          <h2 className="mt-6 text-xl font-bold tracking-tight text-slate-800 sm:text-2xl">
            <span className="sr-only">404. </span>
            We can't find that page
          </h2>

          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-500">
            The link may be broken, or the page may have moved. Check the
            address, or go back to where you were.
          </p>

          {/* The address that failed, so users can spot typos */}
          <div className="mx-auto mt-5 max-w-full rounded border border-[#D5CCBA] bg-[#F7F5F0] px-3 py-2">
            <code className="block break-all text-xs text-[#55708F]">
              {pathname}
            </code>
          </div>

          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button
              variant="secondary"
              size="md"
              onClick={() => navigate(-1)}
              className="!inline-flex items-center justify-center gap-1.5"
            >
              <ArrowLeft className="h-4 w-4" />
              Go back
            </Button>

            <Button
              variant="green"
              size="md"
              onClick={() => navigate("/")}
              className="!inline-flex items-center justify-center gap-1.5"
            >
              <Home className="h-4 w-4" />
              Go to dashboard
            </Button>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Error404;
