#usage
#Rscript state_transition3.r DIR_state_CSVs outfilePlotName.pdf

require(reshape2)
require(ggplot2)
require(plyr)
require(scales)
require(ggdendro)
require(gridExtra)
args <- commandArgs(trailingOnly = TRUE)


heatmapPlot <- function(res,norm=TRUE){
	if (norm == TRUE){
		matNorm <- res/apply(res,1,max)
	} else {
		matNorm <- res
	}
	b <- data.frame(matNorm)


	b$state <- rownames(b)
	b$state <- factor(b$state,levels=unique(b$state),ordered=TRUE)



	mdf <- melt(b, id.var="state")
	mdf$state <- with(mdf,factor(state,levels=rev(sort(unique(state)))))

	p <- ggplot(mdf,aes(variable,state)) + geom_tile(aes(fill=value))+
	  scale_fill_gradient(low="white",high="red")
	return(p)
}

files = dir(args[1])
	
plots <- list()
itr <- 1
for (i in files){

	
	csv <- read.csv(paste(args[1],i,sep="/"),header=FALSE)

	csv_t <- t(csv)

	row.names(csv_t) <- csv_t[,1]

	colnames(csv_t) <- csv_t[1,]
	csv_t <- csv_t[-1,-1]

	class(csv_t) <- "numeric"

	states <- csv_t


	#states <- read.table("lincRNATSS_chromHMMstate_allEpg.txt.gz",sep=",")

	ao = states[,c("CEMT_40_18_segments_stateNumeric","CEMT_42_18_segments_stateNumeric")]
	sc = states[,c("CEMT_41_18_segments_stateNumeric","CEMT_43_18_segments_stateNumeric")]


	res = matrix(0,ncol=18,nrow=18)


	for(s1 in 1:18){
	    for(s2 in 1:18){
	      res[s1,s2] = sum(rowSums(sc == s1)*rowSums(ao == s2))
	  }
	}
	p <- heatmapPlot(res,norm=TRUE)
	itr <- itr + 1
	plots <- c(plots,list(p))
	p <- heatmapPlot(res,norm=FALSE)
	itr <- itr + 1
	plots <- c(plots,list(p))
}




pdf(args[2],height=4*itr/2,width=14)
do.call(grid.arrange,c(plots,as.table=FALSE,ncol=2))

dev.off()



